/**
 * Testes unitários para a lógica de filtragem de especialidades por perfil do regulador.
 * Valida que:
 * - Perfis "Regulador" veem apenas especialidades do seu Grande Grupo
 * - Perfis "Monitoramento" e "Administrador" veem todas as especialidades
 */

import { describe, it, expect } from "vitest";

// ─── Tipos e constantes ────────────────────────────────────────────────────────

interface ReguladorInfo {
  nome: string;
  perfil: string | null;
  grandeGrupo: string | null;
  email: string;
}

const PERFIS_IRRESTRITO = ["monitoramento", "administrador"];

// ─── Funções de filtragem (replicadas do componente Regulation.tsx) ────────────

function isPerfilIrrestrito(regulador: ReguladorInfo | null): boolean {
  if (!regulador?.perfil) return false;
  return PERFIS_IRRESTRITO.includes(regulador.perfil.toLowerCase());
}

function filtrarDadosPorPerfil(
  data: (string | number)[][],
  regulador: ReguladorInfo | null
): (string | number)[][] {
  const irrestrito = isPerfilIrrestrito(regulador);
  if (irrestrito || !regulador?.grandeGrupo) return data;

  const gruposDoRegulador = regulador.grandeGrupo
    .split(/[,;\/]/)
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean);

  if (gruposDoRegulador.length === 0) return data;

  return data.filter((row) => {
    const especialidade = String(row[9]).toLowerCase();
    return gruposDoRegulador.some((grupo) => especialidade.includes(grupo));
  });
}

// ─── Dados de teste ────────────────────────────────────────────────────────────

// Estrutura: [agenda, municipio, cotas, saldo, aguardando, autorizadas, autCotas, indexRegula, central, especialidade]
const dadosTeste: (string | number)[][] = [
  ["AGENDA ORTOPEDIA 1", "PORTO ALEGRE", 10, 5, 20, 3, "0.30", 2.5, "1CRS", "ORTOPEDIA ADULTO"],
  ["AGENDA ORTOPEDIA 2", "CANOAS", 8, 2, 15, 1, "0.13", 3.1, "2CRS", "ORTOPEDIA JOELHO"],
  ["AGENDA CARDIOLOGIA 1", "PORTO ALEGRE", 15, 10, 30, 5, "0.33", 1.8, "1CRS", "CARDIOLOGIA ADULTO"],
  ["AGENDA NEUROLOGIA 1", "GRAVATAÍ", 12, 8, 25, 4, "0.33", 2.0, "3CRS", "NEUROLOGIA ADULTO"],
  ["AGENDA OFTALMOLOGIA 1", "VIAMÃO", 6, 3, 18, 2, "0.33", 2.8, "1CRS", "OFTALMOLOGIA GERAL"],
  ["AGENDA ORTOPEDIA 3", "ESTEIO", 20, 12, 40, 6, "0.30", 1.5, "1CRS", "ORTOPEDIA MAO ADULTO"],
];

// ─── Testes ────────────────────────────────────────────────────────────────────

describe("Filtragem de especialidades por perfil do regulador", () => {
  describe("isPerfilIrrestrito", () => {
    it("deve retornar true para perfil Administrador", () => {
      const regulador: ReguladorInfo = {
        nome: "Admin Teste",
        perfil: "Administrador",
        grandeGrupo: "ORTOPEDIA",
        email: "admin@test.com",
      };
      expect(isPerfilIrrestrito(regulador)).toBe(true);
    });

    it("deve retornar true para perfil Monitoramento", () => {
      const regulador: ReguladorInfo = {
        nome: "Monitor Teste",
        perfil: "Monitoramento",
        grandeGrupo: null,
        email: "monitor@test.com",
      };
      expect(isPerfilIrrestrito(regulador)).toBe(true);
    });

    it("deve retornar false para perfil Regulador", () => {
      const regulador: ReguladorInfo = {
        nome: "Regulador Teste",
        perfil: "Regulador",
        grandeGrupo: "ORTOPEDIA",
        email: "reg@test.com",
      };
      expect(isPerfilIrrestrito(regulador)).toBe(false);
    });

    it("deve retornar false para regulador nulo", () => {
      expect(isPerfilIrrestrito(null)).toBe(false);
    });

    it("deve ser case-insensitive para o perfil", () => {
      const reguladorUpper: ReguladorInfo = {
        nome: "Admin",
        perfil: "ADMINISTRADOR",
        grandeGrupo: null,
        email: "admin@test.com",
      };
      const reguladorLower: ReguladorInfo = {
        nome: "Admin",
        perfil: "administrador",
        grandeGrupo: null,
        email: "admin@test.com",
      };
      expect(isPerfilIrrestrito(reguladorUpper)).toBe(true);
      expect(isPerfilIrrestrito(reguladorLower)).toBe(true);
    });
  });

  describe("filtrarDadosPorPerfil", () => {
    it("deve retornar todos os dados para perfil Administrador", () => {
      const regulador: ReguladorInfo = {
        nome: "Admin",
        perfil: "Administrador",
        grandeGrupo: "ORTOPEDIA",
        email: "admin@test.com",
      };
      const resultado = filtrarDadosPorPerfil(dadosTeste, regulador);
      expect(resultado).toHaveLength(dadosTeste.length);
    });

    it("deve retornar todos os dados para perfil Monitoramento", () => {
      const regulador: ReguladorInfo = {
        nome: "Monitor",
        perfil: "Monitoramento",
        grandeGrupo: null,
        email: "monitor@test.com",
      };
      const resultado = filtrarDadosPorPerfil(dadosTeste, regulador);
      expect(resultado).toHaveLength(dadosTeste.length);
    });

    it("deve filtrar dados para perfil Regulador com Grande Grupo ORTOPEDIA", () => {
      const regulador: ReguladorInfo = {
        nome: "Regulador Ortopedia",
        perfil: "Regulador",
        grandeGrupo: "ORTOPEDIA",
        email: "reg@test.com",
      };
      const resultado = filtrarDadosPorPerfil(dadosTeste, regulador);
      // Deve retornar apenas as 3 linhas de ortopedia
      expect(resultado).toHaveLength(3);
      resultado.forEach((row) => {
        expect(String(row[9]).toLowerCase()).toContain("ortopedia");
      });
    });

    it("deve filtrar dados para perfil Regulador com Grande Grupo CARDIOLOGIA", () => {
      const regulador: ReguladorInfo = {
        nome: "Regulador Cardio",
        perfil: "Regulador",
        grandeGrupo: "CARDIOLOGIA",
        email: "reg@test.com",
      };
      const resultado = filtrarDadosPorPerfil(dadosTeste, regulador);
      expect(resultado).toHaveLength(1);
      expect(String(resultado[0][9]).toLowerCase()).toContain("cardiologia");
    });

    it("deve suportar múltiplos grupos separados por vírgula", () => {
      const regulador: ReguladorInfo = {
        nome: "Regulador Multi",
        perfil: "Regulador",
        grandeGrupo: "ORTOPEDIA, CARDIOLOGIA",
        email: "reg@test.com",
      };
      const resultado = filtrarDadosPorPerfil(dadosTeste, regulador);
      // 3 ortopedia + 1 cardiologia = 4
      expect(resultado).toHaveLength(4);
    });

    it("deve suportar múltiplos grupos separados por ponto e vírgula", () => {
      const regulador: ReguladorInfo = {
        nome: "Regulador Multi",
        perfil: "Regulador",
        grandeGrupo: "NEUROLOGIA;OFTALMOLOGIA",
        email: "reg@test.com",
      };
      const resultado = filtrarDadosPorPerfil(dadosTeste, regulador);
      // 1 neurologia + 1 oftalmologia = 2
      expect(resultado).toHaveLength(2);
    });

    it("deve retornar todos os dados quando grandeGrupo é nulo para Regulador", () => {
      const regulador: ReguladorInfo = {
        nome: "Regulador Sem Grupo",
        perfil: "Regulador",
        grandeGrupo: null,
        email: "reg@test.com",
      };
      const resultado = filtrarDadosPorPerfil(dadosTeste, regulador);
      expect(resultado).toHaveLength(dadosTeste.length);
    });

    it("deve retornar todos os dados quando regulador é nulo", () => {
      const resultado = filtrarDadosPorPerfil(dadosTeste, null);
      expect(resultado).toHaveLength(dadosTeste.length);
    });

    it("deve retornar lista vazia quando nenhuma especialidade corresponde ao grupo", () => {
      const regulador: ReguladorInfo = {
        nome: "Regulador Sem Match",
        perfil: "Regulador",
        grandeGrupo: "DERMATOLOGIA",
        email: "reg@test.com",
      };
      const resultado = filtrarDadosPorPerfil(dadosTeste, regulador);
      expect(resultado).toHaveLength(0);
    });

    it("deve ser case-insensitive na comparação de especialidades", () => {
      const regulador: ReguladorInfo = {
        nome: "Regulador Cardio",
        perfil: "Regulador",
        grandeGrupo: "cardiologia", // minúsculas
        email: "reg@test.com",
      };
      const resultado = filtrarDadosPorPerfil(dadosTeste, regulador);
      // Deve encontrar "CARDIOLOGIA ADULTO" mesmo com grandeGrupo em minúsculas
      expect(resultado).toHaveLength(1);
    });
  });
});
