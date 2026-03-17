import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

export interface ReguladorInfo {
  nome: string;
  perfil: string | null;       // valor bruto da planilha, ex: "MONITORAMENTO, REGULADOR"
  grandeGrupo: string | null;
  agendas: string | null;
  email: string;
}

interface ReguladorContextType {
  regulador: ReguladorInfo | null;
  perfilAtivo: string | null;          // perfil em uso no momento
  perfisDisponiveis: string[];         // lista de perfis do usuário
  temMultiplosPerfis: boolean;
  trocarPerfil: (perfil: string) => void;
}

const ReguladorContext = createContext<ReguladorContextType>({
  regulador: null,
  perfilAtivo: null,
  perfisDisponiveis: [],
  temMultiplosPerfis: false,
  trocarPerfil: () => {},
});

// Parseia o campo perfil (ex: "MONITORAMENTO, REGULADOR") em lista normalizada
function parsePerfis(perfil: string | null): string[] {
  if (!perfil) return [];
  return perfil
    .split(/[,;]/)
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);
}

export function ReguladorProvider({
  children,
  regulador,
}: {
  children: ReactNode;
  regulador: ReguladorInfo | null;
}) {
  const perfisDisponiveis = useMemo(() => parsePerfis(regulador?.perfil ?? null), [regulador]);

  // Perfil ativo padrão: primeiro perfil disponível
  const [perfilAtivo, setPerfilAtivo] = useState<string | null>(
    perfisDisponiveis.length > 0 ? perfisDisponiveis[0] : null
  );

  const temMultiplosPerfis = perfisDisponiveis.length > 1;

  const trocarPerfil = (perfil: string) => {
    if (perfisDisponiveis.includes(perfil.toLowerCase())) {
      setPerfilAtivo(perfil.toLowerCase());
    }
  };

  return (
    <ReguladorContext.Provider
      value={{ regulador, perfilAtivo, perfisDisponiveis, temMultiplosPerfis, trocarPerfil }}
    >
      {children}
    </ReguladorContext.Provider>
  );
}

export function useRegulador() {
  return useContext(ReguladorContext);
}
