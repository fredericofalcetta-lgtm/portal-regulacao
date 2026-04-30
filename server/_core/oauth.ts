import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import axios from "axios";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

export function registerOAuthRoutes(app: Express) {
  // Redirecionar para o Google OAuth
  app.get("/api/auth/login", (req: Request, res: Response) => {
    const redirectUri = `${ENV.appUrl}/api/auth/callback/google`;
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  // Callback do Google OAuth
  app.get("/api/auth/callback/google", async (req: Request, res: Response) => {
    const code = req.query.code as string;

    if (!code) {
      res.status(400).json({ error: "Código de autorização ausente" });
      return;
    }

    try {
      const redirectUri = `${ENV.appUrl}/api/auth/callback/google`;

      // Trocar código por token
      const tokenRes = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const { access_token } = tokenRes.data;

      // Buscar informações do usuário
      const userRes = await axios.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const { id, name, email } = userRes.data;

      if (!id || !email) {
        res.status(400).json({ error: "Informações do usuário incompletas" });
        return;
      }

      // Salvar/atualizar usuário no banco
      await db.upsertUser({
        openId: id,
        name: name || null,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Criar sessão JWT
      const sessionToken = await sdk.createSessionToken(id, {
        name: name || "",
        email,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "Falha no login com Google" });
    }
  });

  // Mantém compatibilidade com rota antiga do Manus (redireciona para nova)
  app.get("/api/oauth/callback", (req: Request, res: Response) => {
    res.redirect(302, "/api/auth/login");
  });
}
