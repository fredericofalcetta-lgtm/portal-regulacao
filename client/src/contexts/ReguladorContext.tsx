import { createContext, useContext, ReactNode } from 'react';

export interface ReguladorInfo {
  nome: string;
  perfil: string | null;
  grandeGrupo: string | null;
  agendas: string | null;
  email: string;
}

interface ReguladorContextType {
  regulador: ReguladorInfo | null;
}

const ReguladorContext = createContext<ReguladorContextType>({ regulador: null });

export function ReguladorProvider({
  children,
  regulador,
}: {
  children: ReactNode;
  regulador: ReguladorInfo | null;
}) {
  return (
    <ReguladorContext.Provider value={{ regulador }}>
      {children}
    </ReguladorContext.Provider>
  );
}

export function useRegulador() {
  return useContext(ReguladorContext);
}
