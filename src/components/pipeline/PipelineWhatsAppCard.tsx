import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIntegrations, useUpsertIntegration, useDisconnectIntegration } from '@/hooks/useIntegrations';
import {
  MessageCircle,
  Smartphone,
  Loader2,
  RefreshCw,
  Unplug,
} from 'lucide-react';

const PROVIDER = 'evolution_api_pipeline';
const PIPELINE_INSTANCE = 'pipeline';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelineWhatsAppCard({ open, onOpenChange }: Props) {
  const { data: integrations } = useIntegrations();
  const upsert = useUpsertIntegration();
  const disconnect = useDisconnectIntegration();
  const { toast } = useToast();

  const pipelineWa = integrations?.find((i) => i.provider === PROVIDER);
  const isConnected = pipelineWa?.status === 'connected';

  const [status, setStatus] = useState<'unknown' | 'open' | 'close' | 'error'>('unknown');
  const [qr, setQr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const checkStatus = async (): Promise<string> => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-status', {
        body: { instance: PIPELINE_INSTANCE },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const state: string = data?.state ?? 'error';
      setStatus(state as any);
      setQr(data?.qrcode ?? null);
      if (state === 'open') {
        stopPolling();
        // Salva no banco em background — não bloqueia o fechamento
        upsert.mutate({
          provider: PROVIDER,
          name: 'WhatsApp Pipeline',
          status: 'connected',
          config: { instance_name: PIPELINE_INSTANCE, connected_at: new Date().toISOString() } as any,
        });
        toast({ title: 'WhatsApp do pipeline conectado!' });
        onOpenChange(false);
      }
      return state;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao verificar WhatsApp', description: message, variant: 'destructive' });
      return 'error';
    } finally {
      setChecking(false);
    }
  };

  const handleOpen = async () => {
    setStatus('unknown');
    setQr(null);
    const state = await checkStatus();
    if (state !== 'open') {
      pollingRef.current = setInterval(async () => {
        const s = await checkStatus();
        if (s === 'open') stopPolling();
      }, 4000);
    }
  };

  const handleClose = () => {
    stopPolling();
    onOpenChange(false);
  };

  const handleDisconnect = () => {
    if (pipelineWa) disconnect.mutate(pipelineWa.id);
  };

  // Quando o dialog abre, inicia o fluxo
  const handleOpenChange = (o: boolean) => {
    if (o) handleOpen();
    else handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            Conectar WhatsApp Pipeline
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {isConnected && status === 'unknown' ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-semibold text-green-600">WhatsApp Conectado!</p>
              <p className="text-sm text-muted-foreground text-center">
                Instância <span className="font-mono">pipeline</span> ativa e pronta para envios.
              </p>
            </div>
          ) : status === 'open' ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-semibold text-green-600">WhatsApp Conectado!</p>
              <p className="text-sm text-muted-foreground text-center">
                Seu WhatsApp está conectado e pronto para enviar mensagens no pipeline.
              </p>
            </div>
          ) : qr ? (
            <>
              <div className="rounded-xl overflow-hidden border-2 border-border p-2 bg-white">
                <img src={qr} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Escaneie o QR Code com seu celular</p>
                <p className="text-xs text-muted-foreground">Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Aguardando conexão…
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Carregando QR Code…</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isConnected && status === 'unknown' && (
            <Button variant="destructive" size="sm" className="gap-1.5 mr-auto" onClick={handleDisconnect}>
              <Unplug className="w-3.5 h-3.5" /> Desconectar
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>Fechar</Button>
          {status !== 'open' && !(isConnected && status === 'unknown') && (
            <Button variant="secondary" onClick={checkStatus} disabled={checking}>
              {checking ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Atualizar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
