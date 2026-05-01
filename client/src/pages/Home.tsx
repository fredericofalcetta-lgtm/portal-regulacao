import { useCallback, useEffect } from 'react';
import { Route, Switch, useLocation, Redirect } from 'wouter';
import Sidebar from '@/components/Sidebar';
import Regulation from './Regulation';
import Dashboard from './Dashboard';
import Documentos from './Documentos';
import Landing from './Landing';
import MinhasAgendas from './MinhasAgendas';
import MonitorCheckIns from './MonitorCheckIns';
import Reguladores from './Reguladores';
import AgendasRelacionadas from './AgendasRelacionadas';
import SemCotas from './SemCotas';
import NovasAgendas from './NovasAgendas';
import { trpc } from '@/lib/trpc';
import { useRegulador } from '@/contexts/ReguladorContext';

export default function Home() {
  const [location] = useLocation();
  const utils = trpc.useUtils();
  const { perfilAtivo } = useRegulador();

  // Perfil é exclusivamente regulador (sem admin/monitoramento)
  const perfilNorm = (perfilAtivo ?? '').toLowerCase();
  const isReguladorPuro =
    perfilNorm === 'regulador' ||
    (perfilNorm.includes('regulador') &&
      !perfilNorm.includes('administrador') &&
      !perfilNorm.includes('monitoramento'));

  // Invalidar sheets.getData quando agendas concluídas mudarem
  // (para que a aba Regulação reflita o status de concluída)
  const invalidateSheetsData = useCallback(() => {
    utils.sheets.getData.invalidate();
  }, [utils]);

  // Limpar check-ins apenas quando o usuário FECHAR a aba (não ao atualizar)
  // Estratégia: marcar sessionStorage no pagehide e verificar no próximo load
  useEffect(() => {
    // Se a página está sendo recarregada (F5), o sessionStorage persiste — não limpar
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // persisted=true indica que a página vai para o bfcache (não fechar)
      // Usamos sessionStorage para distinguir reload de fechar
      sessionStorage.setItem('portal_reloading', '1');
    };
    const handlePageHide = (e: PageTransitionEvent) => {
      if (!e.persisted && !sessionStorage.getItem('portal_reloading')) {
        // Aba sendo fechada de verdade — limpar check-ins
        navigator.sendBeacon('/api/checkins/clear');
      }
      sessionStorage.removeItem('portal_reloading');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // staleTime de 5 minutos: não refaz a query ao trocar de aba
  const { data: sheetsData, isLoading, dataUpdatedAt: sheetsDataUpdatedAt } = trpc.sheets.getData.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const rows = sheetsData?.rows ?? [];
  const concluidasIds = sheetsData?.concluidasIds ?? [];

  const handleRefresh = useCallback(() => {
    utils.sheets.getData.invalidate();
  }, [utils]);

  // Derivar currentPage da URL sem setState no render
  const currentPage = (() => {
    if (location === '/' || location === '') return 'inicio';
    const page = location.replace('/', '');
    // Redirecionar rotas legadas para a página unificada
    if (page === 'prioridades' || page === 'protocolos') return 'documentos';
    return page;
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
          <Route path="/">
            {() => isReguladorPuro ? <Redirect to="/minhas-agendas" /> : <Landing />}
          </Route>
          <Route path="/regulacao">
            {() => <Regulation data={rows} concluidasIds={concluidasIds} onConcluir={invalidateSheetsData} onRefresh={handleRefresh} dataUpdatedAt={sheetsDataUpdatedAt} />}
          </Route>
          <Route path="/dashboard">
            {() => <Dashboard data={rows} onRefresh={handleRefresh} />}
          </Route>
          <Route path="/prioridades" component={Documentos} />
          <Route path="/protocolos" component={Documentos} />
          <Route path="/documentos" component={Documentos} />
          <Route path="/minhas-agendas" component={MinhasAgendas} />
          <Route path="/monitor-checkins" component={MonitorCheckIns} />
          <Route path="/reguladores" component={Reguladores} />
          <Route path="/agendas-relacionadas" component={AgendasRelacionadas} />
          <Route path="/novas-agendas" component={NovasAgendas} />
          <Route path="/sem-cotas" component={SemCotas} />
        </Switch>
      </main>
    </div>
  );
}
