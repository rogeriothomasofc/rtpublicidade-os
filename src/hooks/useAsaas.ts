import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAsaasBalance(enabled = true, environment?: string) {
  return useQuery({
    queryKey: ['asaas-balance', environment],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('asaas-api', {
        body: { action: 'get_balance', payload: {} },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data.balance as number;
    },
    enabled,
    staleTime: 2 * 60_000, // 2 min
    refetchOnMount: true,
    retry: false,
  });
}

async function callAsaasApi(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('asaas-api', {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useAsaasCreateCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ finance_id, billing_type }: { finance_id: string; billing_type: 'PIX' | 'BOLETO' | 'CREDIT_CARD' }) =>
      callAsaasApi('create_charge', { finance_id, billing_type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Cobrança criada no Asaas!');
    },
    onError: (e: Error) => toast.error('Erro Asaas: ' + e.message),
  });
}

export function useAsaasCancelCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (finance_id: string) => callAsaasApi('cancel_charge', { finance_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Cobrança cancelada no Asaas');
    },
    onError: (e: Error) => toast.error('Erro Asaas: ' + e.message),
  });
}

export function useAsaasSyncCharges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => callAsaasApi('sync_charges', {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success(`Sincronização Asaas: ${data.synced} registro(s) atualizado(s)`);
    },
    onError: (e: Error) => toast.error('Erro ao sincronizar: ' + e.message),
  });
}

export function useAsaasGetPixQr() {
  return useMutation({
    mutationFn: (finance_id: string) => callAsaasApi('get_pix_qr', { finance_id }),
    onError: (e: Error) => toast.error('Erro ao buscar PIX: ' + e.message),
  });
}

export function useAsaasImportCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => callAsaasApi('import_customers', {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Clientes Asaas: ${data.linked} vinculado(s), ${data.skipped} sem correspondência`);
    },
    onError: (e: Error) => toast.error('Erro ao importar clientes: ' + e.message),
  });
}

export function useAsaasImportCharges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => callAsaasApi('import_charges', {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success(`Importação Asaas: ${data.linked} vinculada(s), ${data.created} criada(s), ${data.skipped} ignorada(s)`);
    },
    onError: (e: Error) => toast.error('Erro ao importar: ' + e.message),
  });
}

export function useAsaasBulkCreateCharges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => callAsaasApi('bulk_create_charges', {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      if (data.errors > 0 && data.errorMessages?.length) {
        toast.warning(`${data.created} criada(s), ${data.errors} erro(s): ${data.errorMessages[0]}`);
      } else {
        toast.success(`${data.created} cobrança(s) criada(s) no Asaas!${data.errors > 0 ? ` (${data.errors} erro(s))` : ''}`);
      }
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });
}

export function useAsaasReceiveInCash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (finance_id: string) => callAsaasApi('receive_in_cash', { finance_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (e: Error) => toast.warning('Pago no sistema, mas erro ao atualizar Asaas: ' + e.message),
  });
}
