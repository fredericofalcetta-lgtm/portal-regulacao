/**
 * Utilitário para aplicar destaque visual por cor nas agendas.
 * A cor vem da coluna O da planilha (campo `cor` no banco).
 * Suporta nomes de cores em português e inglês, em maiúsculas ou minúsculas.
 */

/** Retorna a classe CSS de borda lateral colorida para a linha da tabela */
export function getCorBorderClass(cor: string | null | undefined): string {
  if (!cor) return "";
  const c = cor.toLowerCase().trim();
  if (c.includes("vermelho") || c.includes("red"))     return "border-l-4 border-l-red-500";
  if (c.includes("laranja") || c.includes("orange"))   return "border-l-4 border-l-orange-500";
  if (c.includes("amarelo") || c.includes("yellow"))   return "border-l-4 border-l-yellow-400";
  if (c.includes("verde") || c.includes("green"))      return "border-l-4 border-l-green-500";
  if (c.includes("azul") || c.includes("blue"))        return "border-l-4 border-l-blue-500";
  if (c.includes("roxo") || c.includes("purple") || c.includes("violeta")) return "border-l-4 border-l-purple-500";
  if (c.includes("rosa") || c.includes("pink"))        return "border-l-4 border-l-pink-500";
  if (c.includes("cinza") || c.includes("gray") || c.includes("grey")) return "border-l-4 border-l-gray-400";
  if (c.includes("branco") || c.includes("white"))     return "border-l-4 border-l-slate-200";
  if (c.includes("preto") || c.includes("black"))      return "border-l-4 border-l-slate-800";
  // Tenta usar como cor CSS direta (ex: "#ff0000", "rgb(...)")
  return "";
}

/** Retorna o estilo inline de borda lateral para cores não mapeadas (hex, rgb, etc.) */
export function getCorBorderStyle(cor: string | null | undefined): React.CSSProperties {
  if (!cor) return {};
  const c = cor.toLowerCase().trim();
  // Se não é um nome em português/inglês reconhecido, tenta usar como valor CSS
  const nomesMapeados = [
    "vermelho","red","laranja","orange","amarelo","yellow",
    "verde","green","azul","blue","roxo","purple","violeta",
    "rosa","pink","cinza","gray","grey","branco","white","preto","black"
  ];
  if (nomesMapeados.some(n => c.includes(n))) return {};
  // Valor CSS direto
  return { borderLeftWidth: "4px", borderLeftStyle: "solid", borderLeftColor: cor.trim() };
}

/** Retorna um badge pequeno com a cor para exibir ao lado do nome da agenda */
export function getCorBadgeStyle(cor: string | null | undefined): React.CSSProperties {
  if (!cor) return {};
  const c = cor.toLowerCase().trim();
  const colorMap: Record<string, string> = {
    vermelho: "#ef4444", red: "#ef4444",
    laranja: "#f97316", orange: "#f97316",
    amarelo: "#facc15", yellow: "#facc15",
    verde: "#22c55e", green: "#22c55e",
    azul: "#3b82f6", blue: "#3b82f6",
    roxo: "#a855f7", purple: "#a855f7", violeta: "#a855f7",
    rosa: "#ec4899", pink: "#ec4899",
    cinza: "#9ca3af", gray: "#9ca3af", grey: "#9ca3af",
    branco: "#f1f5f9", white: "#f1f5f9",
    preto: "#1e293b", black: "#1e293b",
  };
  const found = Object.entries(colorMap).find(([k]) => c.includes(k));
  const color = found ? found[1] : cor.trim();
  return { backgroundColor: color, width: "10px", height: "10px", borderRadius: "50%", display: "inline-block", flexShrink: 0 };
}
