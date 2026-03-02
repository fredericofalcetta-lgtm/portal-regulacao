import { useEffect, useState } from 'react';
import { Route, Switch } from 'wouter';
import Sidebar from '@/components/Sidebar';
import Regulation from './Regulation';
import Dashboard from './Dashboard';

export default function Home() {
  const [data, setData] = useState<(string | number)[][]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('regulacao');

  useEffect(() => {
    // Load data from public folder
    fetch('/processed_data.json')
      .then(res => res.json())
      .then(json => {
        setData(json.rows);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
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
              return <Regulation data={data} />;
            }}
          </Route>
          <Route path="/dashboard">
            {() => {
              setCurrentPage('dashboard');
              return <Dashboard data={data} />;
            }}
          </Route>
          <Route path="/">
            {() => {
              setCurrentPage('regulacao');
              return <Regulation data={data} />;
            }}
          </Route>
        </Switch>
      </div>
    </div>
  );
}
