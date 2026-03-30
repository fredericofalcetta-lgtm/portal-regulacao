/**
 * Utilitário para aplicar destaque visual por cor nas agendas.
 * A cor vem da coluna O da planilha (campo `cor` no banco).
 * Suporta nomes em português (masculino e feminino) e inglês, em qualquer capitalização.
 * Exemplos de valores no banco: "VERMELHA", "AMARELA", "VERDE"
 */

import type { CSSProperties } from 'react';

/** Normaliza o valor de cor para comparação */
function norm(cor: string | null | undefined): string {
  return (cor ?? "").toLowerCase().trim();
}

/** Detecta a cor canônica a partir do valor em português/inglês */
function detectCor(cor: string | null | undefined): string | null {
  const c = norm(cor);
  if (!c) return null;
  if (c.includes("vermelh") || c.includes("red"))                         return "red";
  if (c.includes("laranj") || c.includes("orange"))                       return "orange";
  if (c.includes("amarela") || c.includes("amarelo") || c.includes("yellow")) return "yellow";
  if (c.includes("verde") || c.includes("green"))                         return "green";
  if (c.includes("azul") || c.includes("blue"))                           return "blue";
  if (c.includes("roxo") || c.includes("roxa") || c.includes("purple") || c.includes("violeta")) return "purple";
  if (c.includes("rosa") || c.includes("pink"))                           return "pink";
  if (c.includes("cinza") || c.includes("gray") || c.includes("grey"))    return "gray";
  if (c.includes("branco") || c.includes("branca") || c.includes("white")) return "white";
  if (c.includes("preto") || c.includes("preta") || c.includes("black"))  return "black";
  return null; // valor desconhecido — pode ser CSS direto
}

/** Mapa de cor canônica → valor hex */
const HEX_MAP: Record<string, string> = {
  red:    "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green:  "#22c55e",
  blue:   "#3b82f6",
  purple: "#a855f7",
  pink:   "#ec4899",
  gray:   "#9ca3af",
  white:  "#f1f5f9",
  black:  "#1e293b",
};

/** Retorna o valor hex da cor, ou o valor CSS direto se não mapeado */
function getHex(cor: string | null | undefined): string | null {
  if (!cor) return null;
  const canonical = detectCor(cor);
  if (canonical) return HEX_MAP[canonical] ?? null;
  // Tenta usar como valor CSS direto (ex: "#ff0000")
  const c = cor.trim();
  if (c.startsWith("#") || c.startsWith("rgb")) return c;
  return null;
}

/**
 * Retorna estilo inline para a linha da tabela:
 * borda lateral mais espessa e fundo levemente colorido.
 */
export function getCorRowStyle(cor: string | null | undefined): CSSProperties {
  const hex = getHex(cor);
  if (!hex) return {};
  return {
    borderLeft: `5px solid ${hex}`,
    backgroundColor: `${hex}18`, // ~10% de opacidade
  };
}

/**
 * Retorna estilo inline para o badge circular ao lado do nome da agenda.
 * Badge maior (14×14px) para maior visibilidade.
 */
export function getCorBadgeStyle(cor: string | null | undefined): CSSProperties {
  const hex = getHex(cor);
  if (!hex) return {};
  return {
    backgroundColor: hex,
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
    boxShadow: `0 0 0 2px ${hex}40`,
  };
}

/** Ordem de prioridade das cores para agrupamento (menor = mais prioritário) */
const COR_PRIORIDADE: Record<string, number> = {
  red:    1,
  orange: 2,
  yellow: 3,
  green:  4,
  blue:   5,
  purple: 6,
  pink:   7,
  gray:   8,
  white:  9,
  black:  10,
};

/**
 * Retorna a prioridade numérica da cor para ordenação.
 * Cores desconhecidas ou ausentes recebem prioridade máxima (999).
 */
export function getCorPrioridade(cor: string | null | undefined): number {
  const canonical = detectCor(cor);
  if (!canonical) return 999;
  return COR_PRIORIDADE[canonical] ?? 999;
}

/**
 * Retorna a classe Tailwind de borda lateral (para uso em className).
 * Mantido por compatibilidade — prefira getCorRowStyle quando possível.
 */
export function getCorBorderClass(_cor: string | null | undefined): string {
  return ""; // lógica migrada para getCorRowStyle (inline style)
}

/**
 * Retorna o estilo inline de borda lateral (legado).
 * @deprecated Use getCorRowStyle que também aplica fundo colorido.
 */
export function getCorBorderStyle(cor: string | null | undefined): CSSProperties {
  return getCorRowStyle(cor);
}
