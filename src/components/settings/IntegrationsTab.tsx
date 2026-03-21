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

  // Webhook
  const [webhookDialog, setWebhookDialog] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: '', secret: '', name: '', events: '' });
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  const webhookIntegration = integrations?.find((i) => i.provider === 'webhook');
  const asaasIntegration = integrations?.find((i) => i.provider === 'asaas');
  const metaIntegration = integrations?.find((i) => i.provider === 'meta_ads');

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
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#1877F2"/>
                      <path d="M13.188 15.938h-1.5v-5.25h-.938v-1.313h.938V8.813c0-1.25.563-2 1.938-2h1.25v1.312h-.75c-.563 0-.625.188-.625.563v.688h1.438l-.188 1.312h-1.25v5.25h-.313z" fill="white"/>
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
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Novo </span>Webhook
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
                        {['update-overdue-tasks', 'update-overdue-finance', 'send-push', 'send-client-email', 'invite-client', 'create-member-user'].map((ep) => (
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
          <DialogFooter className="gap-2">
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
