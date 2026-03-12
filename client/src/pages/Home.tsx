import { useCallback, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import Sidebar from '@/components/Sidebar';
import Regulation from './Regulation';
import Dashboard from './Dashboard';
import Prioridades from './Prioridades';
import Protocolos from './Protocolos';
import Landing from './Landing';
import MinhasAgendas from './MinhasAgendas';
import MonitorCheckIns from './MonitorCheckIns';
import { trpc } from '@/lib/trpc';

export default function Home() {
  const [location] = useLocation();
  const utils = trpc.useUtils();

  // Limpar check-ins quando o usuário fechar a aba ou o navegador
  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/checkins/clear');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // staleTime de 5 minutos: não refaz a query ao trocar de aba
  const { data: sheetsData, isLoading } = trpc.sheets.getData.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const rows = sheetsData?.rows ?? [];

  const handleRefresh = useCallback(() => {
    utils.sheets.getData.invalidate();
  }, [utils]);

  // Derivar currentPage da URL sem setState no render
  const currentPage = (() => {
    if (location === '/' || location === '') return 'inicio';
    return location.replace('/', '');
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar fixo */}
      <Sidebar currentPage={currentPage} />

      {/* Área de conteúdo — usa padding-left para não re-calcular layout inteiro */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/regulacao">
            {() => <Regulation data={rows} />}
          </Route>
          <Route path="/dashboard">
            {() => <Dashboard data={rows} onRefresh={handleRefresh} />}
          </Route>
          <Route path="/prioridades" component={Prioridades} />
          <Route path="/protocolos" component={Protocolos} />
          <Route path="/minhas-agendas" component={MinhasAgendas} />
          <Route path="/monitor-checkins" component={MonitorCheckIns} />
        </Switch>
      </main>
    </div>
  );
}
