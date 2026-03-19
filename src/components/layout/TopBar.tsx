import { useState, useEffect } from 'react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Settings, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { AIChat } from '@/components/ai/AIChat';

const sidebarEvent = new EventTarget();
export const toggleMobileSidebar = () => sidebarEvent.dispatchEvent(new Event('toggle'));
export const onMobileSidebarToggle = (cb: () => void) => {
  sidebarEvent.addEventListener('toggle', cb);
  return () => sidebarEvent.removeEventListener('toggle', cb);
};

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // Atalho Cmd+K / Ctrl+K
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

  const initials = profile?.name
    ? profile.name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 md:px-8 py-2.5 md:py-[11.5px] bg-background">
        {/* Left — hamburger mobile */}
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-sidebar'))}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Busca — desktop: campo clicável, mobile: ícone */}
          {!isMobile ? (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-sm text-muted-foreground group"
            >
              <Search className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
              <span className="min-w-[140px] text-left">Buscar...</span>
              <div className="flex items-center gap-0.5 ml-2">
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">⌘</kbd>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">K</kbd>
              </div>
            </button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Botão IA */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={aiOpen ? 'default' : 'ghost'}
                size="icon"
                className={`h-8 w-8 transition-all ${aiOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary'}`}
                onClick={() => setAiOpen(prev => !prev)}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Assistente IA</TooltipContent>
          </Tooltip>

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-border hover:ring-primary transition-colors">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || ''} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
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

      {/* Modais/Painéis */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <AIChat open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
