import { useState, useEffect, useRef } from 'react';
import { SmtpSettingsCard } from './SmtpSettingsCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  useIntegrations,
  useUpsertIntegration,
  useDisconnectIntegration,
  useIntegrationLogs,
} from '@/hooks/useIntegrations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import {
  Wifi,
  RefreshCw,
  Unplug,
  Loader2,
  KeyRound,
  Webhook,
  Copy,
  Check as CheckIcon,
  Settings,
  Plus,
  ExternalLink,
  BookOpen,
  MessageCircle,
  QrCode,
  Smartphone,
} from 'lucide-react';

const apiEndpoints = [
  {
    endpoint: 'update-overdue-tasks',
    method: 'POST',
    description: 'Atualiza o status de todas as tarefas com prazo vencido para "overdue".',
    params: [],
  },
  {
    endpoint: 'update-overdue-finance',
    method: 'POST',
    description: 'Atualiza o status de cobranças financeiras com vencimento passado.',
    params: [],
  },
  {
    endpoint: 'send-push',
    method: 'POST',
    description: 'Envia uma notificação push para um ou mais usuários do sistema.',
    params: [
      { name: 'user_id', type: 'string', required: true, desc: 'ID do usuário destinatário' },
      { name: 'title', type: 'string', required: true, desc: 'Título da notificação' },
      { name: 'message', type: 'string', required: true, desc: 'Corpo da mensagem' },
    ],
  },
  {
    endpoint: 'send-client-email',
    method: 'POST',
    description: 'Envia um email para um cliente usando o SMTP configurado.',
    params: [
      { name: 'to_email', type: 'string', required: true, desc: 'Email do destinatário' },
      { name: 'to_name', type: 'string', required: false, desc: 'Nome do destinatário' },
      { name: 'subject', type: 'string', required: true, desc: 'Assunto do email' },
      { name: 'html_body', type: 'string', required: true, desc: 'Corpo do email em HTML' },
    ],
  },
  {
    endpoint: 'invite-client',
    method: 'POST',
    description: 'Cria acesso ao portal do cliente e envia o convite por email.',
    params: [
      { name: 'client_id', type: 'string', required: true, desc: 'ID do cliente na plataforma' },
      { name: 'email', type: 'string', required: true, desc: 'Email do cliente' },
    ],
  },
  {
    endpoint: 'create-member-user',
    method: 'POST',
    description: 'Cria um usuário de autenticação para um novo membro da equipe.',
    params: [
      { name: 'email', type: 'string', required: true, desc: 'Email do membro' },
      { name: 'name', type: 'string', required: true, desc: 'Nome completo do membro' },
      { name: 'role', type: 'string', required: false, desc: '"admin" ou "member" (padrão: "member")' },
    ],
  },
];
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function IntegrationsTab() {
  const { data: integrations, isLoading } = useIntegrations();
  const upsert = useUpsertIntegration();
  const disconnect = useDisconnectIntegration();
  const { toast } = useToast();

  // Webhook
  const [webhookDialog, setWebhookDialog] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: '', secret: '', name: '', events: '' });
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedApiUrl, setCopiedApiUrl] = useState(false);
  const [apiDocsOpen, setApiDocsOpen] = useState(false);

  const [logsDialog, setLogsDialog] = useState<string | null>(null);

  // Asaas
  const [asaasDialog, setAsaasDialog] = useState(false);
  const [asaasForm, setAsaasForm] = useState({ apiKey: '', environment: 'sandbox' as 'sandbox' | 'production' });
  const [savingAsaas, setSavingAsaas] = useState(false);
  const [testingAsaas, setTestingAsaas] = useState(false);

  // Meta Ads
  const [metaDialog, setMetaDialog] = useState(false);
  const [metaForm, setMetaForm] = useState({ accessToken: '' });
  const [savingMeta, setSavingMeta] = useState(false);
  const [testingMeta, setTestingMeta] = useState(false);

  // WhatsApp / Evolution API
  const [whatsappStatus, setWhatsappStatus] = useState<'unknown' | 'open' | 'close' | 'connecting' | 'error'>('unknown');
  const [whatsappQr, setWhatsappQr] = useState<string | null>(null);
  const [whatsappQrDialog, setWhatsappQrDialog] = useState(false);
  const [checkingWhatsapp, setCheckingWhatsapp] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const webhookIntegration = integrations?.find((i) => i.provider === 'webhook');
  const asaasIntegration = integrations?.find((i) => i.provider === 'asaas');
  const metaIntegration = integrations?.find((i) => i.provider === 'meta_ads');
  const waIntegration = integrations?.find((i) => i.provider === 'evolution_api');

  // WhatsApp handlers
  const checkWhatsappStatus = async () => {
    setCheckingWhatsapp(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-status');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const state = data?.state ?? 'error';
      setWhatsappStatus(state);
      setWhatsappQr(data?.qrcode ?? null);
      if (state === 'open') {
        upsert.mutate({
          provider: 'evolution_api', name: 'WhatsApp', status: 'connected',
          config: { connected_at: new Date().toISOString() } as any,
        });
        stopPolling();
        setWhatsappQrDialog(false);
        toast({ title: 'WhatsApp conectado!' });
      }
      return state;
    } catch (err: unknown) {
      setWhatsappStatus('error');
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao verificar WhatsApp', description: message, variant: 'destructive' });
      return 'error';
    } finally {
      setCheckingWhatsapp(false);
    }
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleOpenQrDialog = async () => {
    setWhatsappQrDialog(true);
    await checkWhatsappStatus();
    pollingRef.current = setInterval(async () => {
      const state = await checkWhatsappStatus();
      if (state === 'open') stopPolling();
    }, 4000);
  };

  const handleCloseQrDialog = () => {
    stopPolling();
    setWhatsappQrDialog(false);
  };

  const handleDisconnectWhatsapp = () => {
    const wa = integrations?.find((i) => i.provider === 'evolution_api');
    if (wa) disconnect.mutate(wa.id);
    setWhatsappStatus('close');
  };

  // Checar status do WhatsApp ao montar (silencioso)
  useEffect(() => {
    supabase.functions.invoke('evolution-status')
      .then(({ data }) => { if (data?.state) setWhatsappStatus(data.state); })
      .catch(() => {});
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDisconnect = (id: string) => {
    disconnect.mutate(id);
  };

  // Webhook handlers
  const handleConnectWebhook = () => {
    if (webhookIntegration) {
      const config = webhookIntegration.config as Record<string, unknown> | null;
      setWebhookForm({
        url: (config?.url as string) || '',
        secret: (config?.secret as string) || '',
        name: webhookIntegration.name || '',
        events: (config?.events as string) || '',
      });
    }
    setWebhookDialog(true);
  };

  const handleTestWebhook = async () => {
    if (!webhookForm.url) {
      toast({ title: 'Informe a URL do webhook', variant: 'destructive' });
      return;
    }
    setTestingWebhook(true);
    try {
      const res = await fetch(webhookForm.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookForm.secret ? { 'X-Webhook-Secret': webhookForm.secret } : {}),
        },
        body: JSON.stringify({ event: 'test', timestamp: new Date().toISOString(), data: { message: 'Teste de conexão' } }),
      });
      if (res.ok || res.status === 200 || res.status === 201 || res.status === 204) {
        toast({ title: 'Webhook respondeu com sucesso!' });
      } else {
        toast({ title: 'Webhook respondeu com erro', description: `Status: ${res.status}`, variant: 'destructive' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao testar webhook', description: message, variant: 'destructive' });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSaveWebhook = () => {
    upsert.mutate(
      {
        provider: 'webhook',
        name: webhookForm.name || 'Webhook',
        status: 'connected',
        config: {
          url: webhookForm.url,
          secret: webhookForm.secret,
          events: webhookForm.events,
          connected_at: new Date().toISOString(),
        } as any,
      },
      { onSuccess: () => { setWebhookDialog(false); toast({ title: 'Webhook configurado!' }); } }
    );
  };

  const handleCopyWebhookUrl = () => {
    if (webhookIntegration) {
      const config = webhookIntegration.config as Record<string, unknown> | null;
      const url = config?.url as string;
      if (url) {
        navigator.clipboard.writeText(url);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
        toast({ title: 'URL copiada!' });
      }
    }
  };

  // Asaas handlers
  const handleOpenAsaasDialog = () => {
    const config = asaasIntegration?.config as Record<string, unknown> | null;
    setAsaasForm({
      apiKey: (config?.api_key as string) || '',
      environment: ((config?.environment as string) || 'sandbox') as 'sandbox' | 'production',
    });
    setAsaasDialog(true);
  };

  const handleTestAsaas = async () => {
    if (!asaasForm.apiKey.trim()) {
      toast({ title: 'Informe a API Key', variant: 'destructive' });
      return;
    }
    setTestingAsaas(true);
    try {
      const baseUrl = asaasForm.environment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3';
      const res = await fetch(`${baseUrl}/finance/getCurrentBalance`, {
        headers: { access_token: asaasForm.apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: 'Conexão bem-sucedida!', description: `Saldo atual: R$ ${Number(data.balance || 0).toFixed(2)}` });
      } else {
        toast({ title: 'Falha na conexão', description: `Status: ${res.status}`, variant: 'destructive' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro de conexão', description: message, variant: 'destructive' });
    } finally {
      setTestingAsaas(false);
    }
  };

  const handleSaveAsaas = () => {
    if (!asaasForm.apiKey.trim()) {
      toast({ title: 'Informe a API Key', variant: 'destructive' });
      return;
    }
    setSavingAsaas(true);
    upsert.mutate(
      {
        provider: 'asaas',
        name: 'Asaas',
        status: 'connected',
        config: {
          api_key: asaasForm.apiKey.trim(),
          environment: asaasForm.environment,
          billing_type: 'PIX',
          days_before_due: 3,
          connected_at: new Date().toISOString(),
        } as any,
      },
      {
        onSuccess: () => {
          setAsaasDialog(false);
          setSavingAsaas(false);
          toast({ title: 'Asaas configurado!', description: 'API Key salva com sucesso.' });
        },
        onError: () => setSavingAsaas(false),
      }
    );
  };

  const handleDisconnectAsaas = () => {
    if (asaasIntegration) {
      disconnect.mutate(asaasIntegration.id);
    }
  };

  // Meta Ads handlers
  const handleOpenMetaDialog = () => {
    const config = metaIntegration?.config as Record<string, unknown> | null;
    setMetaForm({ accessToken: (config?.access_token as string) || '' });
    setMetaDialog(true);
  };

  const handleTestMeta = async () => {
    if (!metaForm.accessToken.trim()) {
      toast({ title: 'Informe o Access Token', variant: 'destructive' });
      return;
    }
    setTestingMeta(true);
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${metaForm.accessToken.trim()}`);
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Token inválido', description: data.error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Token válido!', description: `Conectado como: ${data.name || data.id}` });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao testar token', description: message, variant: 'destructive' });
    } finally {
      setTestingMeta(false);
    }
  };

  const handleSaveMeta = () => {
    if (!metaForm.accessToken.trim()) {
      toast({ title: 'Informe o Access Token', variant: 'destructive' });
      return;
    }
    setSavingMeta(true);
    upsert.mutate(
      {
        provider: 'meta_ads',
        name: 'Meta Ads',
        status: 'connected',
        config: {
          access_token: metaForm.accessToken.trim(),
          connected_at: new Date().toISOString(),
        } as any,
      },
      {
        onSuccess: () => {
          setMetaDialog(false);
          setSavingMeta(false);
          toast({ title: 'Meta Ads configurado!', description: 'Token salvo com sucesso.' });
        },
        onError: () => setSavingMeta(false),
      }
    );
  };

  const handleDisconnectMeta = () => {
    if (metaIntegration) {
      disconnect.mutate(metaIntegration.id);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isWebhookConnected = webhookIntegration?.status === 'connected';
  const isAsaasConnected = asaasIntegration?.status === 'connected';
  const isMetaConnected = metaIntegration?.status === 'connected';

  return (
    <>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Integrações</h2>
          <p className="text-sm text-muted-foreground">Conecte canais e ferramentas externas</p>
        </div>

        {/* Ferramentas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Ferramentas</h3>
          <div className="grid gap-4 md:grid-cols-2 w-full">
            {/* Email SMTP */}
            <SmtpSettingsCard />

            {/* Asaas */}
            <Card className="w-full overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">Asaas</span>
                        <Badge variant={isAsaasConnected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {isAsaasConnected ? 'Conectado' : 'Disponível'}
                        </Badge>
                      </div>
                      {isAsaasConnected && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleOpenAsaasDialog}>
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Cobranças automáticas via Pix para seus clientes
                    </p>
                    {isAsaasConnected && (
                      <p className="text-xs text-muted-foreground">
                        Ambiente: {((asaasIntegration?.config as any)?.environment === 'production') ? 'Produção' : 'Sandbox'}
                      </p>
                    )}
                    {!isAsaasConnected && (
                      <Button size="sm" className="gap-1.5" onClick={handleOpenAsaasDialog}>
                        Conectar
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meta Ads */}
            <Card className="w-full overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 60 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="metaLogoGrad" x1="0" y1="28" x2="60" y2="0" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#0082FB"/>
                          <stop offset="100%" stopColor="#00C8FF"/>
                        </linearGradient>
                      </defs>
                      <path d="M30 10.5C27.8 7.2 24.8 5 21.5 5C15.7 5 11 10.4 11 16C11 21.6 14.8 23 17.5 23C20.8 23 22.8 21.2 25.5 17C26.5 15.3 27.8 13.2 30 10.5ZM30 10.5C32.2 7.2 35.2 5 38.5 5C44.3 5 49 10.4 49 16C49 21.6 45.2 23 42.5 23C39.2 23 37.2 21.2 34.5 17C33.5 15.3 32.2 13.2 30 10.5Z" fill="url(#metaLogoGrad)" fillRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">Meta Ads</span>
                        <Badge variant={isMetaConnected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {isMetaConnected ? 'Conectado' : 'Disponível'}
                        </Badge>
                      </div>
                      {isMetaConnected && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleOpenMetaDialog}>
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Painel de performance das contas de anúncios dos clientes
                    </p>
                    {isMetaConnected && (
                      <p className="text-xs text-muted-foreground">
                        System User Access Token configurado
                      </p>
                    )}
                    {!isMetaConnected && (
                      <Button size="sm" className="gap-1.5" onClick={handleOpenMetaDialog}>
                        Conectar
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp / Evolution API */}
            {(() => {
              const isWaConnected = whatsappStatus === 'open' || waIntegration?.status === 'connected';
              return (
                <Card className="w-full overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${isWaConnected ? 'bg-green-500/10' : 'bg-muted'}`}>
                        <MessageCircle className={`w-5 h-5 sm:w-6 sm:h-6 ${isWaConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">WhatsApp</span>
                            <Badge variant={isWaConnected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                              {whatsappStatus === 'connecting' ? 'Conectando…' : isWaConnected ? 'Conectado' : 'Desconectado'}
                            </Badge>
                          </div>
                          {isWaConnected && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" title="Desconectar" onClick={handleDisconnectWhatsapp}>
                              <Unplug className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Envio de alertas e relatórios automáticos via WhatsApp
                        </p>
                        {isWaConnected ? (
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-xs text-muted-foreground">Instância conectada e pronta para envios</span>
                          </div>
                        ) : (
                          <Button size="sm" className="gap-1.5" onClick={handleOpenQrDialog} disabled={checkingWhatsapp}>
                            {checkingWhatsapp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                            {checkingWhatsapp ? 'Verificando…' : 'Gerar QR Code'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>

        {/* API & Webhooks */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">API & Webhooks</h3>

          {/* Webhooks Configurados */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-sm md:text-base">Webhooks Configurados</h4>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={handleConnectWebhook}>
                  {isWebhookConnected ? (
                    <>
                      <Settings className="w-3.5 h-3.5" />
                      Editar
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Novo </span>Webhook
                    </>
                  )}
                </Button>
              </div>

              {isWebhookConnected ? (
                <WebhookRow
                  integration={webhookIntegration!}
                  onEdit={handleConnectWebhook}
                  onToggle={() => {
                    if (webhookIntegration!.status === 'connected') {
                      handleDisconnect(webhookIntegration!.id);
                    } else {
                      handleConnectWebhook();
                    }
                  }}
                  onCopyUrl={handleCopyWebhookUrl}
                  copiedUrl={copiedUrl}
                  onLogs={() => setLogsDialog(webhookIntegration!.id)}
                />
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Webhook className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum webhook configurado</p>
                  <p className="text-xs mt-1">Configure webhooks para enviar eventos para sistemas externos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* API do Sistema */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">API do Sistema</h3>
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <KeyRound className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">API REST</span>
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">Ativa</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Endpoint para receber dados de sistemas externos (N8N, Make, Zapier, etc.)
                  </p>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">URL Base</Label>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs bg-muted px-2.5 py-1.5 rounded border border-border break-all flex-1">
                          {import.meta.env.VITE_SUPABASE_URL}/functions/v1/
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/`);
                            setCopiedApiUrl(true);
                            setTimeout(() => setCopiedApiUrl(false), 2000);
                          }}
                        >
                          {copiedApiUrl ? <CheckIcon className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setApiDocsOpen(true)}>
                      <BookOpen className="w-3.5 h-3.5" />
                      Ver documentação
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Webhook Dialog */}
      <Dialog open={webhookDialog} onOpenChange={setWebhookDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={webhookForm.name}
                onChange={(e) => setWebhookForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: N8N, Zapier, Make"
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input
                value={webhookForm.url}
                onChange={(e) => setWebhookForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://hooks.exemplo.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Secret (opcional)</Label>
              <Input
                type="password"
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm((f) => ({ ...f, secret: e.target.value }))}
                placeholder="Token de autenticação"
              />
              <p className="text-xs text-muted-foreground">
                Enviado no header <code className="text-xs bg-muted px-1 rounded">X-Webhook-Secret</code> a cada requisição.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Eventos (opcional)</Label>
              <Input
                value={webhookForm.events}
                onChange={(e) => setWebhookForm((f) => ({ ...f, events: e.target.value }))}
                placeholder="lead.created, task.completed, payment.received"
              />
              <p className="text-xs text-muted-foreground">
                Separe por vírgula. Deixe vazio para todos os eventos.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleTestWebhook} disabled={testingWebhook}>
              {testingWebhook ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Webhook className="w-4 h-4 mr-1" />}
              Testar
            </Button>
            <Button onClick={handleSaveWebhook} disabled={upsert.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asaas Dialog */}
      <Dialog open={asaasDialog} onOpenChange={setAsaasDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Asaas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ambiente</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="asaas-env"
                    checked={asaasForm.environment === 'sandbox'}
                    onChange={() => setAsaasForm((f) => ({ ...f, environment: 'sandbox' }))}
                    className="accent-primary"
                  />
                  <span className="text-sm">Sandbox</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="asaas-env"
                    checked={asaasForm.environment === 'production'}
                    onChange={() => setAsaasForm((f) => ({ ...f, environment: 'production' }))}
                    className="accent-primary"
                  />
                  <span className="text-sm">Produção</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={asaasForm.apiKey}
                onChange={(e) => setAsaasForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder="$aact_..."
              />
              <p className="text-xs text-muted-foreground">
                Encontre sua API Key em{' '}
                <a href="https://www.asaas.com/customerApiKeys/index" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                  Asaas &gt; Integrações &gt; API
                </a>
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            {isAsaasConnected && (
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive mr-auto h-9 w-9" title="Desconectar" onClick={() => { handleDisconnectAsaas(); setAsaasDialog(false); }}>
                <Unplug className="w-4 h-4" />
              </Button>
            )}
            <Button variant="outline" onClick={handleTestAsaas} disabled={testingAsaas}>
              {testingAsaas ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wifi className="w-4 h-4 mr-1" />}
              Testar conexão
            </Button>
            <Button onClick={handleSaveAsaas} disabled={savingAsaas || upsert.isPending}>
              {savingAsaas ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meta Ads Dialog */}
      <Dialog open={metaDialog} onOpenChange={setMetaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Meta Ads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Como obter o Access Token:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Acesse o <strong>Business Manager</strong> da sua agência</li>
                <li>Vá em Configurações → Usuários do sistema</li>
                <li>Crie ou selecione um <strong>Usuário do sistema admin</strong></li>
                <li>Clique em "Gerar novo token" e selecione as permissões de ads_read</li>
                <li>Copie o token gerado e cole abaixo</li>
              </ol>
            </div>
            <div className="space-y-2">
              <Label>System User Access Token</Label>
              <Input
                type="password"
                value={metaForm.accessToken}
                onChange={(e) => setMetaForm((f) => ({ ...f, accessToken: e.target.value }))}
                placeholder="EAAxxxxxxxxxxxxxxx..."
              />
              <p className="text-xs text-muted-foreground">
                O token é armazenado de forma segura e utilizado para buscar métricas das contas vinculadas aos clientes.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            {isMetaConnected && (
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive mr-auto h-9 w-9" title="Desconectar" onClick={() => { handleDisconnectMeta(); setMetaDialog(false); }}>
                <Unplug className="w-4 h-4" />
              </Button>
            )}
            <Button variant="outline" onClick={handleTestMeta} disabled={testingMeta}>
              {testingMeta ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wifi className="w-4 h-4 mr-1" />}
              Testar token
            </Button>
            <Button onClick={handleSaveMeta} disabled={savingMeta || upsert.isPending}>
              {savingMeta ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Docs Dialog */}
      <Dialog open={apiDocsOpen} onOpenChange={setApiDocsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Documentação da API
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-2">
              <p className="text-sm text-muted-foreground">
                Todos os endpoints usam autenticação via header <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Authorization: Bearer &lt;SUPABASE_ANON_KEY&gt;</code>
              </p>
              {apiEndpoints.map((ep) => (
                <div key={ep.endpoint} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="text-[10px] bg-blue-500/20 text-blue-500 border-blue-500/30 hover:bg-blue-500/20">{ep.method}</Badge>
                    <code className="text-sm font-mono font-semibold">{ep.endpoint}</code>
                  </div>
                  <p className="text-sm text-muted-foreground">{ep.description}</p>
                  {ep.params.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Body (JSON)</p>
                      <div className="space-y-1">
                        {ep.params.map((p) => (
                          <div key={p.name} className="flex items-start gap-2 text-xs">
                            <code className="bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{p.name}</code>
                            <span className="text-muted-foreground/70 shrink-0">{p.type}</span>
                            <Badge variant={p.required ? 'default' : 'secondary'} className="text-[9px] px-1 py-0 shrink-0">
                              {p.required ? 'obrigatório' : 'opcional'}
                            </Badge>
                            <span className="text-muted-foreground">{p.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {ep.params.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhum parâmetro necessário no body.</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <LogsDialog integrationId={logsDialog} onClose={() => setLogsDialog(null)} />

      {/* WhatsApp QR Code Dialog */}
      <Dialog open={whatsappQrDialog} onOpenChange={(o) => { if (!o) handleCloseQrDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {whatsappStatus === 'open' ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-semibold text-green-600">WhatsApp Conectado!</p>
                <p className="text-sm text-muted-foreground text-center">Seu WhatsApp está conectado e pronto para enviar mensagens automáticas.</p>
              </div>
            ) : whatsappQr ? (
              <>
                <div className="rounded-xl overflow-hidden border-2 border-border p-2 bg-white">
                  <img src={whatsappQr} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
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
            <Button variant="outline" onClick={handleCloseQrDialog}>Fechar</Button>
            {whatsappStatus !== 'open' && (
              <Button onClick={checkWhatsappStatus} disabled={checkingWhatsapp} variant="secondary">
                {checkingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                Atualizar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WebhookRow({
  integration,
  onEdit,
  onToggle,
  onCopyUrl,
  copiedUrl,
  onLogs,
}: {
  integration: any;
  onEdit: () => void;
  onToggle: () => void;
  onCopyUrl: () => void;
  copiedUrl: boolean;
  onLogs: () => void;
}) {
  const config = integration.config as Record<string, unknown> | null;
  const url = config?.url as string;
  const events = config?.events as string;
  const eventList = events ? events.split(',').map((e: string) => e.trim()).filter(Boolean) : [];
  const isActive = integration.status === 'connected';

  const lastSync = integration.last_sync_at || (config?.connected_at as string);
  let lastSyncLabel = '';
  if (lastSync) {
    try {
      lastSyncLabel = formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR });
    } catch {
      lastSyncLabel = '';
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{integration.name || 'Webhook'}</span>
            <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
              {isActive ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          {url && (
            <div className="flex items-center gap-1.5 min-w-0">
              <code className="text-xs text-muted-foreground truncate max-w-[160px] sm:max-w-[300px]">{url}</code>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={onCopyUrl}>
                {copiedUrl ? <CheckIcon className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          )}
          {eventList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {eventList.map((ev: string) => (
                <span key={ev} className="text-[11px] bg-muted px-2 py-0.5 rounded-full border border-border font-mono">
                  {ev}
                </span>
              ))}
            </div>
          )}
          {lastSyncLabel && (
            <p className="text-xs text-muted-foreground">Último disparo: {lastSyncLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Switch checked={isActive} onCheckedChange={onToggle} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function LogsDialog({ integrationId, onClose }: { integrationId: string | null; onClose: () => void }) {
  const { data: logs } = useIntegrationLogs(integrationId || undefined);

  return (
    <Dialog open={!!integrationId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Logs de integração</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          {!logs?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum log encontrado.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                      {log.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="font-medium">{log.action}</p>
                  {log.message && <p className="text-muted-foreground">{log.message}</p>}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
