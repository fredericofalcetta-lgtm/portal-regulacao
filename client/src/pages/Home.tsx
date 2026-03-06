import { useCallback, useState } from 'react';
import { Route, Switch } from 'wouter';
import Sidebar from '@/components/Sidebar';
import Regulation from './Regulation';
import Dashboard from './Dashboard';
import Prioridades from './Prioridades';
import Protocolos from './Protocolos';
import Landing from './Landing';
import { trpc } from '@/lib/trpc';

const SIDEBAR_OPEN_WIDTH = '16rem';   // w-64
const SIDEBAR_CLOSED_WIDTH = '5rem';  // w-20

export default function Home() {
  const [currentPage, setCurrentPage] = useState('inicio');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const utils = trpc.useUtils();

  const { data: sheetsData, isLoading } = trpc.sheets.getData.useQuery();
  const rows = sheetsData?.rows ?? [];

  const handleRefresh = useCallback(() => {
    utils.sheets.getData.invalidate();
  }, [utils]);

  const handleSidebarToggle = useCallback((isOpen: boolean) => {
    setSidebarOpen(isOpen);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar fixo */}
      <Sidebar currentPage={currentPage} onToggle={handleSidebarToggle} />

      {/* Área de conteúdo — margem esquerda acompanha o sidebar */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden transition-[margin] duration-300 ease-in-out"
        style={{ marginLeft: sidebarOpen ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH }}
      >
        <Switch>
          <Route path="/">
            {() => {
              if (currentPage !== 'inicio') setCurrentPage('inicio');
              return <Landing />;
            }}
          </Route>
          <Route path="/regulacao">
            {() => {
              if (currentPage !== 'regulacao') setCurrentPage('regulacao');
              return <Regulation data={rows} />;
            }}
          </Route>
          <Route path="/dashboard">
            {() => {
              if (currentPage !== 'dashboard') setCurrentPage('dashboard');
              return <Dashboard data={rows} onRefresh={handleRefresh} />;
            }}
          </Route>
          <Route path="/prioridades">
            {() => {
              if (currentPage !== 'prioridades') setCurrentPage('prioridades');
              return <Prioridades />;
            }}
          </Route>
          <Route path="/protocolos">
            {() => {
              if (currentPage !== 'protocolos') setCurrentPage('protocolos');
              return <Protocolos />;
            }}
          </Route>
        </Switch>
      </main>
    </div>
  );
}
