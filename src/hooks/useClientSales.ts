import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useClientProducts(clientId?: string) {
  return useQuery({
    queryKey: ['client_products', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_products')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as { id: string; name: string; created_at: string }[];
    },
    enabled: !!clientId,
  });
}

export function useClientSales(clientId?: string) {
  return useQuery({
    queryKey: ['client_sales', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_sales')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as { id: string; product_name: string; amount: number; created_at: string }[];
    },
    enabled: !!clientId,
  });
}

export function useCreateClientProduct(clientId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('client_products')
        .insert({ name, user_id: user.id, client_id: clientId || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_products', clientId] }),
  });
}

export function useDeleteClientProduct(clientId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_products', clientId] }),
  });
}

export function useDeleteClientSale(clientId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_sales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_sales', clientId] }),
  });
}

export function useCreateClientSale(clientId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, productName, amount }: { productId: string; productName: string; amount: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('client_sales')
        .insert({ product_id: productId, product_name: productName, amount, user_id: user.id, client_id: clientId || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_sales', clientId] }),
  });
}
