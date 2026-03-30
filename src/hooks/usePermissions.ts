import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const ALL_PAGES = [
  { slug: 'dashboard',  label: 'Dashboard' },
  { slug: 'clients',    label: 'Clientes' },
  { slug: 'contracts',  label: 'Contratos' },
  { slug: 'finance',    label: 'Financeiro' },
  { slug: 'team',       label: 'Equipe' },
  { slug: 'pipeline',   label: 'Pipeline' },
  { slug: 'proposals',  label: 'Propostas' },
  { slug: 'projects',   label: 'Projetos' },
  { slug: 'tasks',      label: 'Tarefas' },
  { slug: 'planning',   label: 'Planejamentos' },
  { slug: 'content',    label: 'Conteúdo' },
  { slug: 'campaigns',  label: 'Campanhas' },
  { slug: 'settings',   label: 'Configurações' },
] as const;

export type PageSlug = (typeof ALL_PAGES)[number]['slug'];

export function usePermissions() {
  const { user } = useAuth();

  // Is the current user an admin?
  const { data: isAdmin, isLoading: loadingAdmin } = useQuery({
    queryKey: ['user-is-admin', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
    staleTime: 300_000,
  });

  // Find the team_member record linked to this user (by email)
  const { data: teamMemberId, isLoading: loadingMember } = useQuery({
    queryKey: ['team-member-id-me', user?.email],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_members')
        .select('id')
        .eq('email', user!.email!)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user && isAdmin === false,
    staleTime: 300_000,
  });

  // Fetch this member's allowed pages
  const { data: allowedSlugs, isLoading: loadingPerms } = useQuery({
    queryKey: ['member-permissions', teamMemberId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('member_permissions')
        .select('page_slug')
        .eq('team_member_id', teamMemberId!);
      return new Set<string>((data ?? []).map((r: any) => r.page_slug));
    },
    enabled: !!teamMemberId,
    staleTime: 60_000,
  });

  const loading = loadingAdmin || (isAdmin === false && loadingMember) || (!!teamMemberId && loadingPerms);

  const hasPermission = (slug: string): boolean => {
    if (isAdmin) return true;
    if (slug === 'dashboard') return true; // always accessible
    if (allowedSlugs === undefined) return true; // still loading → don't block
    if (allowedSlugs.size === 0) return true; // no restrictions configured → full access
    return allowedSlugs.has(slug);
  };

  return { isAdmin: !!isAdmin, loading, hasPermission };
}
