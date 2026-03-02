import { useEffect, useRef, useState } from 'react';
import { Menu, X, BarChart3, Table2, ListChecks, Home } from 'lucide-react';
import { Link } from 'wouter';

interface SidebarProps {
  currentPage: string;
  onToggle?: (isOpen: boolean) => void;
}

export default function Sidebar({ currentPage, onToggle }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const setOpen = (value: boolean) => {
    setIsOpen(value);
    onToggle?.(value);
  };

  // Auto-collapse after 3 seconds of mouse inactivity
  useEffect(() => {
    if (!isOpen) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setOpen(false), 3000);
    };

    resetTimer();
    window.addEventListener('mousemove', resetTimer);

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  const toggleSidebar = () => setOpen(!isOpen);

  const navItems = [
    { href: '/', page: 'inicio', icon: Home, label: 'Início' },
    { href: '/regulacao', page: 'regulacao', icon: Table2, label: 'Regulação' },
    { href: '/dashboard', page: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { href: '/prioridades', page: 'prioridades', icon: ListChecks, label: 'Listas de Prioridades' },
  ];

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ease-in-out z-40 flex flex-col ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700 shrink-0">
        {isOpen && (
          <h1 className="text-base font-bold truncate">Portal Regulação</h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors ml-auto"
          title={isOpen ? 'Recolher menu' : 'Expandir menu'}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
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
              {isOpen && (
                <span className="text-sm font-medium leading-tight truncate">{label}</span>
              )}
            </a>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      {isOpen && (
        <div className="px-4 py-4 border-t border-slate-700 text-xs text-slate-400 shrink-0">
          Menu recolhe em 3s
        </div>
      )}
    </div>
  );
}
