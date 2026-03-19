import { useState } from 'react';
import { RefreshCw, CheckCircle, Smartphone, Shield, CheckCircle2, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { APP_VERSION } from '@/lib/version';
import { usePWAContext } from '@/components/pwa/PWAProvider';

const UPDATE_TOKEN = import.meta.env.VITE_UPDATE_TOKEN as string | undefined;
const LICENSE_KEY  = import.meta.env.VITE_LICENSE_KEY  as string | undefined;

type AgentStatus = 'idle' | 'checking' | 'up_to_date' | 'available' | 'updating' | 'done' | 'error';

export function SystemTab() {
  const { needRefresh, update } = usePWAContext();
  const [pwaChecked, setPwaChecked] = useState(false);

  // Update agent state
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [latestVersion, setLatestVersion] = useState('');
  const [updateLog, setUpdateLog] = useState<string[]>([]);
  const [agentError, setAgentError] = useState('');

  async function checkForUpdates() {
    setAgentStatus('checking');
    setAgentError('');
    try {
      const res = await fetch('/agent/status', {
        headers: UPDATE_TOKEN ? { Authorization: `Bearer ${UPDATE_TOKEN}` } : {},
      });
      if (!res.ok) throw new Error('Agente de atualização indisponível');
      const data = await res.json();
      setLatestVersion(data.latest_version || '');
      setAgentStatus(data.update_available ? 'available' : 'up_to_date');
    } catch (e: any) {
      setAgentError(e.message);
      setAgentStatus('error');
    }
  }

  async function installUpdate() {
    setAgentStatus('updating');
    setUpdateLog([]);
    try {
      const res = await fetch('/agent/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(UPDATE_TOKEN ? { Authorization: `Bearer ${UPDATE_TOKEN}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Falha ao iniciar atualização');
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.log)   setUpdateLog(l => [...l, obj.log]);
            if (obj.done)  { setAgentStatus('done'); setTimeout(() => window.location.reload(), 2500); }
            if (obj.error) { setAgentError(obj.error); setAgentStatus('error'); }
          } catch {}
        }
      }
    } catch (e: any) {
      setAgentError(e.message);
      setAgentStatus('error');
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Licença */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-primary" />
            Licença
          </CardTitle>
          <CardDescription>Informações sobre a licença deste sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            {LICENSE_KEY ? (
              <Badge className="bg-green-500/15 text-green-500 border-green-500/20 hover:bg-green-500/15">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Ativa
              </Badge>
            ) : (
              <Badge variant="secondary">Sem chave (dev)</Badge>
            )}
          </div>
          {LICENSE_KEY && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Chave</span>
              <span className="text-sm font-mono text-muted-foreground">
                {LICENSE_KEY.slice(0, 8)}••••{LICENSE_KEY.slice(-4)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Versão instalada</span>
            <span className="text-sm font-mono">v{APP_VERSION}</span>
          </div>
        </CardContent>
      </Card>

      {/* Atualizações — PWA (service worker) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="w-5 h-5 text-primary" />
            Versão do Sistema
          </CardTitle>
          <CardDescription>
            Verifique se o sistema está atualizado com as últimas funcionalidades.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm text-muted-foreground">Versão instalada</p>
              <p className="text-2xl font-bold text-foreground">v{APP_VERSION}</p>
            </div>
            {needRefresh ? (
              <Badge variant="default" className="bg-primary text-primary-foreground">
                Nova versão disponível
              </Badge>
            ) : pwaChecked ? (
              <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                <CheckCircle className="w-3 h-3" />
                Atualizado
              </Badge>
            ) : null}
          </div>

          {needRefresh ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Uma nova versão está pronta para ser instalada. Clique em atualizar — a página será recarregada automaticamente.
              </p>
              <Button onClick={update} className="gap-2 w-full sm:w-auto">
                <RefreshCw className="w-4 h-4" />
                Atualizar agora
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setPwaChecked(true)} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {pwaChecked ? 'Verificado — nenhuma atualização disponível' : 'Verificar atualização'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Atualização do servidor (update agent) */}
      {UPDATE_TOKEN && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="w-5 h-5 text-primary" />
              Atualização do Servidor
            </CardTitle>
            <CardDescription>
              Instala novas versões diretamente no servidor sem precisar acessar o terminal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agentStatus === 'up_to_date' && (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                O servidor está na versão mais recente.
              </div>
            )}

            {agentStatus === 'available' && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-yellow-500 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Nova versão disponível: v{latestVersion}
                </div>
                <p className="text-xs text-muted-foreground">
                  O sistema ficará indisponível por ~2 minutos durante a atualização.
                </p>
              </div>
            )}

            {(agentStatus === 'updating' || agentStatus === 'done') && updateLog.length > 0 && (
              <div className="bg-black rounded-md p-3 font-mono text-xs text-green-400 max-h-44 overflow-y-auto space-y-0.5">
                {updateLog.map((line, i) => <div key={i}>{line}</div>)}
                {agentStatus === 'done' && <div className="text-white mt-1">✔ Recarregando...</div>}
              </div>
            )}

            {agentStatus === 'error' && (
              <p className="text-sm text-destructive">{agentError}</p>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={checkForUpdates}
                disabled={agentStatus === 'checking' || agentStatus === 'updating'}
              >
                {agentStatus === 'checking'
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</>
                  : <><RefreshCw className="w-4 h-4 mr-2" />Verificar atualização</>}
              </Button>

              {agentStatus === 'available' && (
                <Button size="sm" onClick={installUpdate}>
                  <Download className="w-4 h-4 mr-2" />
                  Instalar v{latestVersion}
                </Button>
              )}

              {agentStatus === 'updating' && (
                <Button size="sm" disabled>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atualizando...
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
