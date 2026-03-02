import { useState } from 'react';
import { Route, Switch } from 'wouter';
import Sidebar from '@/components/Sidebar';
import Regulation from './Regulation';
import Dashboard from './Dashboard';
import { trpc } from '@/lib/trpc';

export default function Home() {
  const [currentPage, setCurrentPage] = useState('regulacao');
  const utils = trpc.useUtils();

  // Buscar dados do servidor via tRPC
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} />

      <div className="flex-1 overflow-auto">
        <Switch>
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
          <Route path="/">
            {() => {
              setCurrentPage('regulacao');
              return <Regulation data={rows} />;
            }}
          </Route>
        </Switch>
      </div>
    </div>
  );
}
