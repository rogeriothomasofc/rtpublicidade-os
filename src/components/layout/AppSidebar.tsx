import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, CheckSquare, DollarSign, TrendingUp, ChevronLeft, Zap, UsersRound, FileText, FileCheck, Settings, Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePermissions } from '@/hooks/usePermissions';

const navItems = [
  { name: 'Dashboard',     href: '/',          icon: LayoutDashboard, slug: 'dashboard' },
  { name: 'Clientes',      href: '/clients',   icon: Users,           slug: 'clients' },
  { name: 'Contratos',     href: '/contracts', icon: FileText,        slug: 'contracts' },
  { name: 'Financeiro',    href: '/finance',   icon: DollarSign,      slug: 'finance' },
  { name: 'Equipe',        href: '/team',      icon: UsersRound,      slug: 'team' },
  { name: 'Pipeline',      href: '/pipeline',  icon: TrendingUp,      slug: 'pipeline' },
  { name: 'Propostas',     href: '/proposals', icon: FileCheck,       slug: 'proposals' },
  { name: 'Projetos',      href: '/projects',  icon: FolderKanban,    slug: 'projects' },
  { name: 'Tarefas',       href: '/tasks',     icon: CheckSquare,     slug: 'tasks' },
  { name: 'Planejamentos', href: '/planning',  icon: Lightbulb,       slug: 'planning' },
];

const APP_NAME = 'Agency OS';

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const { hasPermission } = usePermissions();

  const visibleNavItems = navItems.filter((item) => hasPermission(item.slug));
  const showSettings = hasPermission('settings');

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  // Listen for hamburger menu event from TopBar
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener('open-mobile-sidebar', handler);
    return () => window.removeEventListener('open-mobile-sidebar', handler);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      document.documentElement.style.setProperty('--sidebar-current-width', collapsed ? '4rem' : '16rem');
    } else {
      document.documentElement.style.setProperty('--sidebar-current-width', '0px');
    }
  }, [collapsed, isMobile]);

  const renderNavItem = (item: { name: string; href: string; icon: React.ElementType }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;
    const showLabel = isMobile || !collapsed;
    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 py-2.5 px-3 mx-2 rounded-lg transition-all text-sm',
          isActive
            ? 'bg-primary/15 text-primary glow-primary'
            : 'text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        )}
      >
        <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive && 'text-primary')} />
        {showLabel && <span className="font-medium">{item.name}</span>}
      </Link>
    );

    if (!isMobile && collapsed) {
      return (
        <Tooltip key={item.name} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.name}</TooltipContent>
        </Tooltip>
      );
    }
    return <div key={item.name}>{linkContent}</div>;
  };

  const logo = (
    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
      <Zap className="w-5 h-5 text-primary-foreground" />
    </div>
  );

  // Mobile: overlay sidebar
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
        {/* Sidebar drawer */}
        <aside
          className={cn(
            'fixed top-0 left-0 h-screen w-72 flex flex-col bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-14 border-b border-sidebar-border px-3">
            <div className="flex items-center gap-2 min-w-0">
              {logo}
              <span className="font-semibold text-lg text-sidebar-foreground truncate">{APP_NAME}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-muted" onClick={() => setMobileOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
            {visibleNavItems.map(renderNavItem)}
          </nav>

          <div className="shrink-0 border-t border-sidebar-border py-2">
            {showSettings && renderNavItem({ name: 'Configurações', href: '/settings', icon: Settings })}
          </div>
        </aside>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside className={cn('fixed top-0 left-0 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 z-30', collapsed ? 'w-16' : 'w-64')}>
      {/* Header */}
      <div className={cn('relative flex items-center h-16 border-b border-sidebar-border shrink-0', collapsed ? 'justify-center px-2' : 'px-3')}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div
              className={cn('flex items-center gap-2 min-w-0', collapsed && 'cursor-pointer')}
              onClick={() => collapsed && setCollapsed(false)}
            >
              {logo}
              {!collapsed && (
                <span className="font-semibold text-lg text-sidebar-foreground truncate">{APP_NAME}</span>
              )}
            </div>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-medium">Expandir menu</TooltipContent>
          )}
        </Tooltip>

        {!collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute z-40 h-7 w-7 rounded-full border border-sidebar-border bg-sidebar text-sidebar-muted hover:text-primary hover:bg-sidebar-accent/50 top-1/2 -translate-y-1/2 right-2"
                onClick={() => setCollapsed(true)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">Recolher menu</TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {visibleNavItems.map(renderNavItem)}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border py-2">
        {showSettings && renderNavItem({ name: 'Configurações', href: '/settings', icon: Settings })}
      </div>
    </aside>
  );
}

// Export a way to open the mobile sidebar from TopBar
export let openMobileSidebar: (() => void) | null = null;

export function AppSidebarWithRef() {
  return <AppSidebar />;
}
