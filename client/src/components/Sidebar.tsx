import { useEffect, useState } from 'react';
import { Menu, X, BarChart3, Table2, ListChecks } from 'lucide-react';
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
      if (collapseTimer) clearTimeout(collapseTimer);
      const timer = setTimeout(() => setIsOpen(false), 3000);
      setCollapseTimer(timer);
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (collapseTimer) clearTimeout(collapseTimer);
      };
    }
  }, [isOpen, collapseTimer]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    if (collapseTimer) clearTimeout(collapseTimer);
  };

  const navItems = [
    { href: '/regulacao', page: 'regulacao', icon: Table2, label: 'Regulação' },
    { href: '/dashboard', page: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { href: '/prioridades', page: 'prioridades', icon: ListChecks, label: 'Listas de Prioridades' },
  ];

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
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(({ href, page, icon: Icon, label }) => (
            <Link key={page} href={href}>
              <a
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
                title={!isOpen ? label : undefined}
              >
                <Icon size={20} className="flex-shrink-0" />
                {isOpen && <span className="text-sm font-medium leading-tight">{label}</span>}
              </a>
            </Link>
          ))}
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
      />
    </>
  );
}
