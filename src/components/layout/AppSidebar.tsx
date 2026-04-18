import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, CheckSquare, DollarSign, TrendingUp, PanelLeftClose, Zap, UsersRound, FileText, FileCheck, Settings, Lightbulb, X, Clapperboard, Megaphone } from 'lucide-react';
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
  { name: 'Conteúdo',     href: '/content',   icon: Clapperboard,    slug: 'content' },
  { name: 'Campanhas',    href: '/campaigns', icon: Megaphone,       slug: 'campaigns' },
  { name: 'Automações',  href: '/automations', icon: Zap,           slug: 'automations' },
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

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

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

  const isItemActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  const renderNavItem = (item: { name: string; href: string; icon: React.ElementType }) => {
    const isActive = isItemActive(item.href);
    const Icon = item.icon;
    const showLabel = isMobile || !collapsed;

    const inner = (
      <div className="relative">
        {isActive && (
          <span className="absolute left-0 inset-y-[5px] w-0.5 rounded-full bg-primary" />
        )}
        <Link
          to={item.href}
          className={cn(
            'flex items-center gap-3 py-2.5 px-3 mx-2 rounded-lg transition-all text-sm font-medium',
            isActive
              ? 'bg-sidebar-accent text-primary font-semibold'
              : 'text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-primary' : '')} />
          {showLabel && <span>{item.name}</span>}
        </Link>
      </div>
    );

    if (!isMobile && collapsed) {
      return (
        <Tooltip key={item.name} delayDuration={0}>
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.name}</TooltipContent>
        </Tooltip>
      );
    }
    return <div key={item.name}>{inner}</div>;
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
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={cn(
            'fixed top-0 left-0 h-screen w-full flex flex-col bg-sidebar z-50 transition-transform duration-300',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between h-14 border-b border-sidebar-border/40 px-4">
            <div className="flex items-center gap-2 min-w-0">
              {logo}
              <span className="font-semibold text-lg text-sidebar-foreground truncate">{APP_NAME}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-sidebar-muted" onClick={() => setMobileOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto px-1 py-3 flex flex-col gap-0.5">
            {visibleNavItems.map(renderNavItem)}
          </nav>
          <div className="shrink-0 border-t border-sidebar-border/40 py-2 px-1">
            {showSettings && renderNavItem({ name: 'Configurações', href: '/settings', icon: Settings })}
          </div>
        </aside>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside className={cn('fixed top-0 left-0 h-screen flex flex-col bg-sidebar transition-all duration-300 z-30', collapsed ? 'w-16' : 'w-64')}>
      <div className={cn('relative flex items-center h-20 border-b border-sidebar-border shrink-0', collapsed ? 'justify-center px-2' : 'px-4')}>
        <div
          className={cn('flex items-center gap-2 min-w-0', collapsed && 'cursor-pointer')}
          onClick={() => collapsed && setCollapsed(false)}
        >
          {logo}
          {!collapsed && (
            <span className="font-semibold text-lg text-sidebar-foreground truncate">{APP_NAME}</span>
          )}
        </div>

        {!collapsed && (
          <Button
            variant="default"
            size="icon"
            className="absolute z-40 h-7 w-7 rounded-md transition-all bg-primary text-primary-foreground top-1/2 -translate-y-1/2 right-2"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose className="w-5 h-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto pt-4 pb-4 flex flex-col gap-1">
        {visibleNavItems.map(renderNavItem)}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border/40 py-2">
        {showSettings && renderNavItem({ name: 'Configurações', href: '/settings', icon: Settings })}
      </div>
    </aside>
  );
}

export let openMobileSidebar: (() => void) | null = null;

export function AppSidebarWithRef() {
  return <AppSidebar />;
}
