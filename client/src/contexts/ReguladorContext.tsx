import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';

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

// Chave usada no localStorage — inclui o email para isolar por usuário
function getStorageKey(email: string): string {
  return `portal-regulacao:perfil-ativo:${email}`;
}

export function ReguladorProvider({
  children,
  regulador,
}: {
  children: ReactNode;
  regulador: ReguladorInfo | null;
}) {
  const perfisDisponiveis = useMemo(() => parsePerfis(regulador?.perfil ?? null), [regulador]);

  // Inicializa o perfil ativo: tenta restaurar do localStorage, senão usa o primeiro disponível
  const [perfilAtivo, setPerfilAtivo] = useState<string | null>(() => {
    if (perfisDisponiveis.length === 0) return null;

    // Tenta recuperar o perfil salvo para este usuário
    if (regulador?.email) {
      try {
        const salvo = localStorage.getItem(getStorageKey(regulador.email));
        if (salvo && perfisDisponiveis.includes(salvo)) {
          return salvo;
        }
      } catch {
        // localStorage pode não estar disponível em alguns contextos
      }
    }

    return perfisDisponiveis[0];
  });

  // Quando os perfis disponíveis mudam (ex: troca de usuário), revalida o perfil ativo
  useEffect(() => {
    if (perfisDisponiveis.length === 0) {
      setPerfilAtivo(null);
      return;
    }

    setPerfilAtivo(prev => {
      // Tenta restaurar do localStorage
      if (regulador?.email) {
        try {
          const salvo = localStorage.getItem(getStorageKey(regulador.email));
          if (salvo && perfisDisponiveis.includes(salvo)) {
            return salvo;
          }
        } catch {
          // ignora erros de localStorage
        }
      }

      // Se o perfil atual ainda é válido, mantém
      if (prev && perfisDisponiveis.includes(prev)) return prev;

      // Caso contrário, usa o primeiro disponível
      return perfisDisponiveis[0];
    });
  }, [perfisDisponiveis, regulador?.email]);

  const temMultiplosPerfis = perfisDisponiveis.length > 1;

  const trocarPerfil = (perfil: string) => {
    const normalizado = perfil.toLowerCase();
    if (perfisDisponiveis.includes(normalizado)) {
      setPerfilAtivo(normalizado);
      // Persiste no localStorage vinculado ao email do usuário
      if (regulador?.email) {
        try {
          localStorage.setItem(getStorageKey(regulador.email), normalizado);
        } catch {
          // ignora erros de localStorage
        }
      }
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
