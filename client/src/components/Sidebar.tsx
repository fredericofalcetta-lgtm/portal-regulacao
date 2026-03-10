import { useEffect, useRef, useState } from 'react';
import { Menu, X, BarChart3, Table2, ListChecks, Home, LogOut, UserCircle2, ScrollText, Sun, Moon, ClipboardList } from 'lucide-react';
import { Link } from 'wouter';
import { useRegulador } from '@/contexts/ReguladorContext';
import { useTheme } from '@/contexts/ThemeContext';
import { trpc } from '@/lib/trpc';

interface SidebarProps {
  currentPage: string;
  onToggle?: (isOpen: boolean) => void;
}

export default function Sidebar({ currentPage, onToggle }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { regulador } = useRegulador();
  const { theme, toggleTheme } = useTheme();
  const clearCheckInsMutation = trpc.checkIns.clearMeus.useMutation();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = '/';
    },
  });

  const handleLogout = async () => {
    try {
      await clearCheckInsMutation.mutateAsync();
    } catch {
      // Ignorar erros ao limpar check-ins
    }
    logoutMutation.mutate();
  };

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
    { href: '/minhas-agendas', page: 'minhas-agendas', icon: ClipboardList, label: 'Minhas Agendas' },
    { href: '/dashboard', page: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { href: '/prioridades', page: 'prioridades', icon: ListChecks, label: 'Listas de Prioridades' },
    { href: '/protocolos', page: 'protocolos', icon: ScrollText, label: 'Protocolos' },
  ];

  const navItemClass = (page: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      currentPage === page
        ? 'bg-blue-600 text-white'
        : 'text-slate-300 hover:bg-slate-700'
    }`;

  // Formata o perfil para exibição
  const perfilLabel = regulador?.perfil
    ? regulador.perfil.charAt(0).toUpperCase() + regulador.perfil.slice(1).toLowerCase()
    : null;

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
          <Link
            key={page}
            href={href}
            className={navItemClass(page)}
            title={!isOpen ? label : undefined}
          >
            <Icon size={20} className="flex-shrink-0" />
            {isOpen && (
              <span className="text-sm font-medium leading-tight truncate">{label}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer — perfil do usuário + tema */}
      <div className="border-t border-slate-700 shrink-0">
        {isOpen ? (
          <div className="px-4 py-4 space-y-3">
            {/* Informações do regulador */}
            {regulador ? (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <UserCircle2 size={20} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate leading-tight">
                    {regulador.nome}
                  </p>
                  {perfilLabel && (
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30">
                      {perfilLabel}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                  <UserCircle2 size={20} className="text-slate-400" />
                </div>
                <p className="text-xs text-slate-400">Carregando perfil...</p>
              </div>
            )}

            {/* Linha de ações: tema + sair */}
            <div className="flex items-center gap-2">
              {/* Botão de alternância de tema */}
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 flex-1 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun size={14} className="shrink-0 text-yellow-400" />
                      <span>Modo claro</span>
                    </>
                  ) : (
                    <>
                      <Moon size={14} className="shrink-0 text-blue-300" />
                      <span>Modo escuro</span>
                    </>
                  )}
                </button>
              )}

              {/* Botão de sair */}
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending || clearCheckInsMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut size={14} className="shrink-0" />
                <span className="sr-only">{logoutMutation.isPending ? 'Saindo...' : 'Sair'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Sidebar recolhido — exibe apenas avatar, botão de tema e sair */
          <div className="px-2 py-3 space-y-2 flex flex-col items-center">
            <div
              className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center cursor-default"
              title={regulador ? `${regulador.nome} — ${perfilLabel ?? ''}` : 'Usuário'}
            >
              <UserCircle2 size={20} className="text-white" />
            </div>

            {/* Botão de tema compacto */}
            {toggleTheme && (
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              >
                {theme === 'dark' ? (
                  <Sun size={16} className="text-yellow-400" />
                ) : (
                  <Moon size={16} className="text-blue-300" />
                )}
              </button>
            )}

            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending || clearCheckInsMutation.isPending}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
