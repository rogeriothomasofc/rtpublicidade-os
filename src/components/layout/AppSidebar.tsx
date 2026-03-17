import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, CheckSquare, DollarSign, TrendingUp, ChevronLeft, ChevronRight, Zap, UsersRound, FileText, FileCheck, Settings, MessageCircle, Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAgencySettings } from '@/hooks/useAgencySettings';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
{ name: 'Dashboard', href: '/', icon: LayoutDashboard },
{ name: 'Clientes', href: '/clients', icon: Users },
{ name: 'Contratos', href: '/contracts', icon: FileText },
{ name: 'Financeiro', href: '/finance', icon: DollarSign },
{ name: 'Equipe', href: '/team', icon: UsersRound },
{ name: 'Pipeline', href: '/pipeline', icon: TrendingUp },
{ name: 'Propostas', href: '/proposals', icon: FileCheck },
{ name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
{ name: 'Projetos', href: '/projects', icon: FolderKanban },
{ name: 'Tarefas', href: '/tasks', icon: CheckSquare },
{ name: 'Planejamentos', href: '/planning', icon: Lightbulb }];


export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { data: settings } = useAgencySettings();
  const isMobile = useIsMobile();

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

  const agencyName = settings?.name || 'Sinap OS';
  const agencyLogo = settings?.logo_url || '';
  const initials = agencyName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const renderNavItem = (item: {name: string;href: string;icon: React.ElementType;}) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;
    const showLabel = isMobile || !collapsed;
    const linkContent =
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-3 py-2.5 px-3 mx-2 rounded-lg transition-all text-sm",
        isActive ?
        'bg-primary/15 text-primary glow-primary' :
        'text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}>
        <Icon className={cn("w-4.5 h-4.5 flex-shrink-0", isActive && "text-primary")} />
        {showLabel && <span className="font-medium">{item.name}</span>}
      </Link>;

    if (!isMobile && collapsed) {
      return (
        <Tooltip key={item.name} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.name}</TooltipContent>
        </Tooltip>);
    }
    return <div key={item.name}>{linkContent}</div>;
  };

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
              {agencyLogo ? (
                <Avatar className="w-8 h-8 rounded-lg shrink-0">
                  <AvatarImage src={agencyLogo} alt={agencyName} className="object-cover" />
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <span className="font-semibold text-lg text-sidebar-foreground truncate">{agencyName}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-muted" onClick={() => setMobileOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
            {navItems.map(renderNavItem)}
          </nav>

          <div className="shrink-0 border-t border-sidebar-border py-2">
            {renderNavItem({ name: 'Configurações', href: '/settings', icon: Settings })}
          </div>
        </aside>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside className={cn('fixed top-0 left-0 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 z-30', collapsed ? 'w-16' : 'w-64')}>
      {/* Header */}
      <div className={cn("relative flex items-center h-16 border-b border-sidebar-border shrink-0", collapsed ? "justify-center px-2" : "px-3")}>
        <div className="flex items-center gap-2 min-w-0">
          {agencyLogo ?
          <Avatar className="w-8 h-8 rounded-lg shrink-0">
              <AvatarImage src={agencyLogo} alt={agencyName} className="object-cover" />
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
            </Avatar> :

          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
          }
          {!collapsed &&
          <span className="font-semibold text-lg text-sidebar-foreground truncate">{agencyName}</span>
          }
        </div>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute z-40 h-7 w-7 rounded-full border border-sidebar-border bg-sidebar text-sidebar-muted hover:text-primary hover:bg-sidebar-accent/50",
                collapsed ?
                "top-1/2 -translate-y-1/2 right-0 translate-x-1/2" :
                "top-1/2 -translate-y-1/2 right-2"
              )}
              onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {collapsed ? 'Expandir menu' : 'Recolher menu'}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {navItems.map(renderNavItem)}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border py-2">
        {renderNavItem({ name: 'Configurações', href: '/settings', icon: Settings })}
      </div>
    </aside>);
}

// Export a way to open the mobile sidebar from TopBar
export let openMobileSidebar: (() => void) | null = null;

export function AppSidebarWithRef() {
  return <AppSidebar />;
}
