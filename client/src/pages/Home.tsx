import { useState } from 'react';
import { Route, Switch } from 'wouter';
import Sidebar from '@/components/Sidebar';
import Regulation from './Regulation';
import Dashboard from './Dashboard';
import Prioridades from './Prioridades';
import Landing from './Landing';
import { trpc } from '@/lib/trpc';

export default function Home() {
  const [currentPage, setCurrentPage] = useState('inicio');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const utils = trpc.useUtils();

  const { data: sheetsData, isLoading } = trpc.sheets.getData.useQuery();
  const rows = sheetsData?.rows ?? [];

  const handleRefresh = () => {
    utils.sheets.getData.invalidate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar currentPage={currentPage} onToggle={setSidebarOpen} />

      {/* Conteúdo principal com margem dinâmica baseada no estado do sidebar */}
      <div
        className="flex-1 overflow-auto transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarOpen ? '16rem' : '5rem' }}
      >
        <Switch>
          <Route path="/">
            {() => {
              setCurrentPage('inicio');
              return <Landing />;
            }}
          </Route>
          <Route path="/regulacao">
            {() => {
              setCurrentPage('regulacao');
              return <Regulation data={rows} />;
            }}
          </Route>
          <Route path="/dashboard">
            {() => {
              setCurrentPage('dashboard');
              return <Dashboard data={rows} onRefresh={handleRefresh} />;
            }}
          </Route>
          <Route path="/prioridades">
            {() => {
              setCurrentPage('prioridades');
              return <Prioridades />;
            }}
          </Route>
        </Switch>
      </div>
    </div>
  );
}
