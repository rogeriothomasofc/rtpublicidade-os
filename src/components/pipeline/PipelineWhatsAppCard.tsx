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
  Wifi,
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
  const [configSaved, setConfigSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<'unknown' | 'open' | 'close' | 'error'>('unknown');
  const [qr, setQr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preenche form com dados salvos ao abrir
  useEffect(() => {
    if (open) {
      setForm({
        url: cfg.url ?? '',
        apiKey: cfg.api_key ?? '',
        instanceName: cfg.instance_name ?? '',
      });
      setConfigSaved(!!pipelineWa && pipelineWa.status === 'connected');
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
        setConfigSaved(true);
        stopPolling();
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

  const handleSaveConfig = async () => {
    if (!form.url.trim() || !form.apiKey.trim() || !form.instanceName.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await upsert.mutateAsync({
        provider: PROVIDER,
        name: 'WhatsApp Pipeline',
        status: 'disconnected',
        config: {
          url: form.url.trim(),
          api_key: form.apiKey.trim(),
          instance_name: form.instanceName.trim(),
        } as any,
      });
      setConfigSaved(true);
      toast({ title: 'Configuração salva!' });
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    const state = await checkStatus(form.url.trim(), form.apiKey.trim(), form.instanceName.trim());
    if (state !== 'open') {
      pollingRef.current = setInterval(async () => {
        const s = await checkStatus(form.url.trim(), form.apiKey.trim(), form.instanceName.trim());
        if (s === 'open') stopPolling();
      }, 4000);
    }
  };

  const handleDisconnect = () => {
    if (pipelineWa) disconnect.mutate(pipelineWa.id);
    setStatus('close');
    setQr(null);
    setConfigSaved(false);
  };

  const handleClose = () => {
    stopPolling();
    onOpenChange(false);
  };

  const isConnected = status === 'open' || (pipelineWa?.status === 'connected' && status === 'unknown');

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            WhatsApp do Pipeline
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
              {isConnected ? 'Conectado' : checking ? 'Verificando…' : 'Desconectado'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Instância separada das automações
            </span>
          </div>

          {isConnected ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-green-500" />
              </div>
              <p className="text-sm font-medium text-green-600">Conectado e pronto!</p>
              <p className="text-xs text-muted-foreground text-center">
                Instância: <span className="font-mono">{cfg.instance_name}</span>
              </p>
              <Button variant="destructive" size="sm" className="gap-1.5 mt-2" onClick={handleDisconnect}>
                <Unplug className="w-3.5 h-3.5" /> Desconectar
              </Button>
            </div>
          ) : (
            <>
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

              {qr && (
                <div className="flex flex-col items-center gap-3 pt-2">
                  <div className="rounded-xl overflow-hidden border-2 border-border p-2 bg-white">
                    <img src={qr} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Aguardando conexão…
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {!isConnected && (
            <>
              <Button variant="outline" size="sm" onClick={handleSaveConfig} disabled={saving || upsert.isPending}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Salvar config
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleConnect}
                disabled={checking || !form.url || !form.apiKey || !form.instanceName}
              >
                {checking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : qr ? (
                  <RefreshCw className="w-3.5 h-3.5" />
                ) : (
                  <QrCode className="w-3.5 h-3.5" />
                )}
                {checking ? 'Verificando…' : qr ? 'Atualizar QR' : 'Conectar'}
              </Button>
            </>
          )}
          {!isConnected && configSaved && !qr && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => checkStatus(form.url, form.apiKey, form.instanceName)} disabled={checking}>
              <Wifi className="w-3.5 h-3.5" /> Verificar status
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
