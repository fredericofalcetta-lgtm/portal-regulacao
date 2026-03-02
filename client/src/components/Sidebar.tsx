import { useEffect, useState } from 'react';
import { Menu, X, BarChart3, Table2 } from 'lucide-react';
import { Link } from 'wouter';

interface SidebarProps {
  currentPage: string;
}

export default function Sidebar({ currentPage }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [collapseTimer, setCollapseTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-collapse after 3 seconds of inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      // Clear existing timer
      if (collapseTimer) {
        clearTimeout(collapseTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 3000);

      setCollapseTimer(timer);
    };

    // Only set up timer if sidebar is open
    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (collapseTimer) {
          clearTimeout(collapseTimer);
        }
      };
    }
  }, [isOpen, collapseTimer]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    // Clear timer when manually toggling
    if (collapseTimer) {
      clearTimeout(collapseTimer);
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ease-in-out z-40 ${
          isOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
          {isOpen && (
            <h1 className="text-lg font-bold truncate">Portal Regulação</h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          <Link href="/regulacao">
            <a
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === 'regulacao'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Table2 size={20} className="flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">Regulação</span>}
            </a>
          </Link>

          <Link href="/dashboard">
            <a
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BarChart3 size={20} className="flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">Dashboard</span>}
            </a>
          </Link>
        </nav>

        {/* Footer */}
        {isOpen && (
          <div className="px-4 py-4 border-t border-slate-700 text-xs text-slate-400">
            <p>Menu recolhe em 3s</p>
          </div>
        )}
      </div>

      {/* Main content offset */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Content will be rendered here */}
      </div>
    </>
  );
}
