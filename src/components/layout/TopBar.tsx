import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Settings, Search, Sparkles, Sun, Moon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { AIChat } from '@/components/ai/AIChat';

const sidebarEvent = new EventTarget();
export const toggleMobileSidebar = () => sidebarEvent.dispatchEvent(new Event('toggle'));
export const onMobileSidebarToggle = (cb: () => void) => {
  sidebarEvent.addEventListener('toggle', cb);
  return () => sidebarEvent.removeEventListener('toggle', cb);
};

const routeTitles = [
  { path: '/',           title: 'Dashboard',      exact: true },
  { path: '/clients',    title: 'Clientes' },
  { path: '/contracts',  title: 'Contratos' },
  { path: '/finance',    title: 'Financeiro' },
  { path: '/team',       title: 'Equipe' },
  { path: '/pipeline',   title: 'Pipeline' },
  { path: '/proposals',  title: 'Propostas' },
  { path: '/projects',   title: 'Projetos' },
  { path: '/tasks',      title: 'Tarefas' },
  { path: '/planning',   title: 'Planejamentos' },
  { path: '/settings',   title: 'Configurações' },
];

function getPageTitle(pathname: string): string {
  const exact = routeTitles.find(r => r.exact && r.path === pathname);
  if (exact) return exact.title;
  const sorted = [...routeTitles].filter(r => !r.exact).sort((a, b) => b.path.length - a.path.length);
  const match = sorted.find(r => pathname.startsWith(r.path));
  return match?.title ?? 'Agency OS';
}

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { resolvedTheme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['profile-topbar', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url, role').eq('user_id', user.id).single(),
        supabase.from('team_members').select('name, avatar_url').eq('email', user.email!).maybeSingle(),
      ]);
      return {
        name: p?.name || m?.name || (user?.user_metadata?.full_name as string) || '',
        avatar_url: p?.avatar_url || m?.avatar_url || (user?.user_metadata?.avatar_url as string) || '',
        role: p?.role || '',
      };
    },
    enabled: !!user,
  });

  const firstName = profile?.name?.split(' ')[0] || '';
  const initials = profile?.name
    ? profile.name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 md:px-8 pt-7 md:pt-8 pb-5 md:pb-6 bg-transparent">

        {/* Left — hamburger mobile + título da página */}
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-sidebar'))}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-2xl font-bold text-foreground truncate">{pageTitle}</h1>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 md:gap-2.5">

          {/* Busca */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-7 w-7" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Buscar <kbd className="ml-1 text-[10px] font-mono">⌘K</kbd></TooltipContent>
          </Tooltip>

          {/* Assistente IA */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={aiOpen ? 'default' : 'ghost'}
                size="icon"
                className={`h-7 w-7 transition-all ${aiOpen ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setAiOpen(prev => !prev)}
              >
                <Sparkles className="h-7 w-7" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Assistente IA</TooltipContent>
          </Tooltip>

          {/* Toggle de tema — ícone único */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hidden sm:flex"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Alternar tema"
          >
            {resolvedTheme === 'dark' ? <Moon className="h-7 w-7" /> : <Sun className="h-7 w-7" />}
          </Button>

          <NotificationBell />

          {/* Avatar + nome */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 outline-none hover:bg-sidebar-accent/60 transition-colors ml-1">
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || ''} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {firstName && !isMobile && (
                  <span className="text-sm font-medium text-foreground hidden md:block">{firstName}</span>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{profile?.name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <AIChat open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
