import { useState } from 'react';
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
import { useGoogleCalendarStatus, useGoogleCalendarAuth, useGoogleCalendarDisconnect } from '@/hooks/useGoogleCalendar';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Unplug,
  FileText,
  Loader2,
  KeyRound,
  Webhook,
  Copy,
  Check as CheckIcon,
  Calendar,
  MessageCircle,
  Settings,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function IntegrationsTab() {
  const { data: integrations, isLoading } = useIntegrations();
  const upsert = useUpsertIntegration();
  const disconnect = useDisconnectIntegration();
  const { toast } = useToast();

  // Evolution
  const [evolutionDialog, setEvolutionDialog] = useState(false);
  const [evolutionForm, setEvolutionForm] = useState({ url: '', apiKey: '', name: '' });
  const [testingConnection, setTestingConnection] = useState(false);

  // Webhook
  const [webhookDialog, setWebhookDialog] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: '', secret: '', name: '', events: '' });
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [logsDialog, setLogsDialog] = useState<string | null>(null);

  // Google Calendar
  const [googleDialog, setGoogleDialog] = useState(false);
  const [googleForm, setGoogleForm] = useState({ clientId: '', clientSecret: '' });
  const [savingGoogle, setSavingGoogle] = useState(false);

  // Asaas
  const [asaasDialog, setAsaasDialog] = useState(false);
  const [asaasForm, setAsaasForm] = useState({ apiKey: '', environment: 'sandbox' as 'sandbox' | 'production' });
  const [savingAsaas, setSavingAsaas] = useState(false);
  const [testingAsaas, setTestingAsaas] = useState(false);
  const { data: gcalStatus } = useGoogleCalendarStatus();
  const googleAuth = useGoogleCalendarAuth();
  const googleDisconnect = useGoogleCalendarDisconnect();

  const evolutionIntegration = integrations?.find((i) => i.provider === 'evolution_api');
  const webhookIntegration = integrations?.find((i) => i.provider === 'webhook');
  const googleIntegration = integrations?.find((i) => i.provider === 'google_calendar');
  const asaasIntegration = integrations?.find((i) => i.provider === 'asaas');

  // Evolution API handlers
  const handleConnectEvolution = () => {
    if (evolutionIntegration) {
      const config = evolutionIntegration.config as Record<string, unknown> | null;
      setEvolutionForm({
        url: (config?.url as string) || '',
        apiKey: (config?.apiKey as string) || '',
        name: evolutionIntegration.name || '',
      });
    }
    setEvolutionDialog(true);
  };

  const handleTestEvolution = async () => {
    if (!evolutionForm.url) {
      toast({ title: 'Informe a URL da instância', variant: 'destructive' });
      return;
    }
    setTestingConnection(true);
    try {
      const url = evolutionForm.url.replace(/\/$/, '');
      const res = await fetch(`${url}/instance/fetchInstances`, {
        headers: { apikey: evolutionForm.apiKey },
      });
      if (res.ok) {
        toast({ title: 'Conexão bem-sucedida!' });
      } else {
        toast({ title: 'Falha na conexão', description: `Status: ${res.status}`, variant: 'destructive' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro de conexão', description: message, variant: 'destructive' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveEvolution = () => {
    upsert.mutate(
      {
        provider: 'evolution_api',
        name: evolutionForm.name || 'API Evolution',
        status: 'connected',
        config: { url: evolutionForm.url, apiKey: evolutionForm.apiKey } as any,
      },
      { onSuccess: () => setEvolutionDialog(false) }
    );
  };

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

  // Google Calendar handlers
  const handleOpenGoogleDialog = () => {
    const config = googleIntegration?.config as Record<string, unknown> | null;
    setGoogleForm({
      clientId: (config?.client_id as string) || '',
      clientSecret: (config?.client_secret as string) || '',
    });
    setGoogleDialog(true);
  };

  const handleSaveGoogleCredentials = () => {
    if (!googleForm.clientId.trim() || !googleForm.clientSecret.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setSavingGoogle(true);
    upsert.mutate(
      {
        provider: 'google_calendar',
        name: 'Google Calendar',
        status: 'connected',
        config: {
          client_id: googleForm.clientId.trim(),
          client_secret: googleForm.clientSecret.trim(),
          connected_at: new Date().toISOString(),
        } as any,
      },
      {
        onSuccess: () => {
          setGoogleDialog(false);
          setSavingGoogle(false);
          toast({ title: 'Credenciais salvas!', description: 'Agora clique em "Conectar" para autorizar o Google Calendar.' });
        },
        onError: () => setSavingGoogle(false),
      }
    );
  };

  const handleConnectGoogle = () => {
    googleAuth.mutate();
  };

  const handleDisconnectGoogle = () => {
    googleDisconnect.mutate();
    if (googleIntegration) {
      disconnect.mutate(googleIntegration.id);
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

  const formatSyncDate = (date: string | null) => {
    if (!date) return null;
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEvolutionConnected = evolutionIntegration?.status === 'connected';
  const isWebhookConnected = webhookIntegration?.status === 'connected';
  const isGoogleConnected = gcalStatus?.connected || false;
  const hasGoogleCredentials = googleIntegration?.status === 'connected';
  const isAsaasConnected = asaasIntegration?.status === 'connected';

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Integrações</h2>
            <p className="text-muted-foreground">Conecte canais e ferramentas externas</p>
          </div>
        </div>

        {/* Canais de Comunicação */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Canais de Comunicação</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {/* WhatsApp */}
            <Card className="relative">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">API Evolution (WhatsApp)</span>
                      <Badge variant={isEvolutionConnected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {isEvolutionConnected ? 'Conectado' : 'Disponível'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Conecte via Evolution API para receber e enviar mensagens
                    </p>
                    {isEvolutionConnected && (
                      <p className="text-xs text-muted-foreground">
                        Última sincronização: {formatSyncDate(evolutionIntegration?.last_sync_at ?? null) || 'Nunca'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isEvolutionConnected ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleConnectEvolution}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {}}>
                          <CheckIcon className="w-3.5 h-3.5" />
                          Conectado
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="gap-1.5" onClick={handleConnectEvolution}>
                        Conectar
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ferramentas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Ferramentas</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Email SMTP */}
            <SmtpSettingsCard />
            {/* Google Calendar */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">Google Calendar</span>
                      <Badge
                        variant={isGoogleConnected ? 'default' : hasGoogleCredentials ? 'secondary' : 'secondary'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {isGoogleConnected ? 'Conectado' : hasGoogleCredentials ? 'Credenciais salvas' : 'Disponível'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Sincronize tarefas, projetos e financeiro com o Google Agenda
                    </p>
                    {hasGoogleCredentials && (
                      <p className="text-xs text-muted-foreground">
                        Client ID: {((googleIntegration?.config as any)?.client_id as string)?.slice(0, 20)}...
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isGoogleConnected ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenGoogleDialog}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDisconnectGoogle}>
                          <CheckIcon className="w-3.5 h-3.5" />
                          Conectado
                        </Button>
                      </>
                    ) : hasGoogleCredentials ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenGoogleDialog}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={handleConnectGoogle} disabled={googleAuth.isPending}>
                          {googleAuth.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Conectar
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="gap-1.5" onClick={handleOpenGoogleDialog}>
                        Conectar
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Asaas */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <KeyRound className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">Asaas</span>
                      <Badge variant={isAsaasConnected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {isAsaasConnected ? 'Conectado' : 'Disponível'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Cobranças automáticas via Pix para seus clientes
                    </p>
                    {isAsaasConnected && (
                      <p className="text-xs text-muted-foreground">
                        Ambiente: {((asaasIntegration?.config as any)?.environment === 'production') ? 'Produção' : 'Sandbox'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAsaasConnected ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenAsaasDialog}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDisconnectAsaas}>
                          <CheckIcon className="w-3.5 h-3.5" />
                          Conectado
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="gap-1.5" onClick={handleOpenAsaasDialog}>
                        Conectar
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* API & Webhooks */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">API & Webhooks</h3>

          {/* Webhooks Configurados */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Webhooks Configurados</h4>
                <Button size="sm" className="gap-1.5" onClick={handleConnectWebhook}>
                  <Plus className="w-3.5 h-3.5" />
                  Novo Webhook
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
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Endpoints Disponíveis</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {['whatsapp-webhook', 'whatsapp-chat', 'update-overdue-tasks', 'update-overdue-finance', 'send-push', 'send-client-email', 'dashboard-summary', 'goals-action-plan', 'planning-ai-summary', 'portal-ai-summary', 'invite-client', 'create-member-user', 'google-calendar-auth', 'google-calendar-callback', 'google-calendar-sync'].map((ep) => (
                          <span key={ep} className="text-[11px] bg-muted px-2 py-0.5 rounded-full border border-border font-mono">
                            {ep}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={evolutionDialog} onOpenChange={setEvolutionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar API Evolution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da conexão</Label>
              <Input
                value={evolutionForm.name}
                onChange={(e) => setEvolutionForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: WhatsApp Principal"
              />
            </div>
            <div className="space-y-2">
              <Label>URL da instância</Label>
              <Input
                value={evolutionForm.url}
                onChange={(e) => setEvolutionForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://api.evolution.exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={evolutionForm.apiKey}
                onChange={(e) => setEvolutionForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder="Sua chave de API"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleTestEvolution} disabled={testingConnection}>
              {testingConnection ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wifi className="w-4 h-4 mr-1" />}
              Testar conexão
            </Button>
            <Button onClick={handleSaveEvolution} disabled={upsert.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Google Calendar Credentials Dialog */}
      <Dialog open={googleDialog} onOpenChange={setGoogleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credenciais Google Calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ID do Cliente (Client ID)</Label>
              <Input
                value={googleForm.clientId}
                onChange={(e) => setGoogleForm((f) => ({ ...f, clientId: e.target.value }))}
                placeholder="xxxxx.apps.googleusercontent.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Chave Secreta (Client Secret)</Label>
              <Input
                type="password"
                value={googleForm.clientSecret}
                onChange={(e) => setGoogleForm((f) => ({ ...f, clientSecret: e.target.value }))}
                placeholder="GOCSPX-..."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Obtenha as credenciais no{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Google Cloud Console
              </a>
              . A URI de redirecionamento autorizada deve ser:{' '}
              <code className="text-xs bg-muted px-1 rounded break-all">
                {import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-callback
              </code>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveGoogleCredentials} disabled={savingGoogle || upsert.isPending}>
              {savingGoogle ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar credenciais
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
          <DialogFooter className="gap-2">
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

      {/* Logs Dialog */}
      <LogsDialog integrationId={logsDialog} onClose={() => setLogsDialog(null)} />
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
            <div className="flex items-center gap-1.5">
              <code className="text-xs text-muted-foreground truncate max-w-[350px]">{url}</code>
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
