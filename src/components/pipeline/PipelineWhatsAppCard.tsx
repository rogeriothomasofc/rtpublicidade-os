import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIntegrations, useUpsertIntegration, useDisconnectIntegration } from '@/hooks/useIntegrations';
import {
  MessageCircle,
  QrCode,
  Smartphone,
  Loader2,
  RefreshCw,
  Unplug,
} from 'lucide-react';

const PROVIDER = 'evolution_api_pipeline';

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
  const cfg = (pipelineWa?.config ?? {}) as Record<string, string>;

  const [form, setForm] = useState({ url: '', apiKey: '', instanceName: '' });
  const [saving, setSaving] = useState(false);

  // QR dialog state
  const [qrOpen, setQrOpen] = useState(false);
  const [status, setStatus] = useState<'unknown' | 'open' | 'close' | 'error'>('unknown');
  const [qr, setQr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        url: cfg.url ?? '',
        apiKey: cfg.api_key ?? '',
        instanceName: cfg.instance_name ?? '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pipelineWa?.id]);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const checkStatus = async (url: string, apiKey: string, instanceName: string): Promise<string> => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-status', {
        body: { url, apiKey, instance: instanceName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const state: string = data?.state ?? 'error';
      setStatus(state as any);
      setQr(data?.qrcode ?? null);
      if (state === 'open') {
        await upsert.mutateAsync({
          provider: PROVIDER,
          name: 'WhatsApp Pipeline',
          status: 'connected',
          config: {
            url,
            api_key: apiKey,
            instance_name: instanceName,
            connected_at: new Date().toISOString(),
          } as any,
        });
        stopPolling();
        setQrOpen(false);
        onOpenChange(false);
        toast({ title: 'WhatsApp do pipeline conectado!' });
      }
      return state;
    } catch (err: unknown) {
      setStatus('error');
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao verificar WhatsApp', description: message, variant: 'destructive' });
      return 'error';
    } finally {
      setChecking(false);
    }
  };

  const handleSaveAndConnect = async () => {
    const { url, apiKey, instanceName } = form;
    if (!url.trim() || !apiKey.trim() || !instanceName.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await upsert.mutateAsync({
        provider: PROVIDER,
        name: 'WhatsApp Pipeline',
        status: 'disconnected',
        config: { url: url.trim(), api_key: apiKey.trim(), instance_name: instanceName.trim() } as any,
      });
    } finally {
      setSaving(false);
    }
    // Abre QR dialog e inicia polling
    setStatus('unknown');
    setQr(null);
    setQrOpen(true);
    const state = await checkStatus(url.trim(), apiKey.trim(), instanceName.trim());
    if (state !== 'open') {
      pollingRef.current = setInterval(async () => {
        const s = await checkStatus(url.trim(), apiKey.trim(), instanceName.trim());
        if (s === 'open') stopPolling();
      }, 4000);
    }
  };

  const handleDisconnect = () => {
    if (pipelineWa) disconnect.mutate(pipelineWa.id);
    stopPolling();
  };

  const handleCloseQr = () => {
    stopPolling();
    setQrOpen(false);
  };

  const isConnected = pipelineWa?.status === 'connected';

  return (
    <>
      {/* Dialog de configuração */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              WhatsApp Pipeline
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
              <span className="text-xs text-muted-foreground">instância separada das automações</span>
            </div>

            {isConnected ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Smartphone className="w-7 h-7 text-green-500" />
                </div>
                <p className="text-sm font-medium text-green-600">Conectado e pronto!</p>
                <p className="text-xs text-muted-foreground">
                  Instância: <span className="font-mono">{cfg.instance_name}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>URL da Evolution API</Label>
                  <Input
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://evolution.seudominio.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                    placeholder="Sua API Key"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome da Instância</Label>
                  <Input
                    value={form.instanceName}
                    onChange={(e) => setForm((f) => ({ ...f, instanceName: e.target.value }))}
                    placeholder="pipeline-prospect"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {isConnected ? (
              <Button variant="destructive" size="sm" className="gap-1.5 w-full" onClick={handleDisconnect}>
                <Unplug className="w-3.5 h-3.5" /> Desconectar
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 w-full"
                onClick={handleSaveAndConnect}
                disabled={saving || upsert.isPending}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                {saving ? 'Salvando…' : 'Gerar QR Code'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog do QR Code — igual ao de Configurações */}
      <Dialog open={qrOpen} onOpenChange={(o) => { if (!o) handleCloseQr(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {status === 'open' ? (
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
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseQr}>Fechar</Button>
            {status !== 'open' && (
              <Button
                variant="secondary"
                onClick={() => checkStatus(form.url.trim(), form.apiKey.trim(), form.instanceName.trim())}
                disabled={checking}
              >
                {checking ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                Atualizar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
