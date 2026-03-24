import { useState, useEffect, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, Wifi, WifiOff, Maximize2 } from 'lucide-react';

const CANDIDATE_PORTS = [5174, 5175, 5173, 5176, 5177];
const PING_INTERVAL = 6000;

type Status = 'checking' | 'online' | 'offline';

async function findDashboard(): Promise<string | null> {
  for (const port of CANDIDATE_PORTS) {
    try {
      await fetch(`http://localhost:${port}`, { mode: 'no-cors', cache: 'no-store' });
      return `http://localhost:${port}`;
    } catch { /* tenta próxima */ }
  }
  return null;
}

export default function SquadPage() {
  const [status, setStatus] = useState<Status>('checking');
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentUrlRef = useRef('');

  const ping = useCallback(async () => {
    const url = await findDashboard();
    if (url) {
      // Só atualiza o iframe se a URL mudou de porta
      if (url !== currentUrlRef.current) {
        currentUrlRef.current = url;
        setDashboardUrl(url);
        // Se já tem iframe renderizado, troca a src
        if (iframeRef.current && iframeRef.current.src !== url) {
          iframeRef.current.src = url;
        }
      }
      setStatus('online');
    } else {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    ping();
    const id = setInterval(ping, PING_INTERVAL);
    return () => clearInterval(id);
  }, [ping]);

  const reload = () => {
    if (iframeRef.current && currentUrlRef.current) {
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = currentUrlRef.current;
      }, 50);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 h-[calc(100vh-8rem)]">
        {/* Barra */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {status === 'checking' && (
              <Badge variant="secondary" className="gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" /> Verificando...
              </Badge>
            )}
            {status === 'online' && (
              <Badge variant="secondary" className="gap-1.5 bg-green-500/15 text-green-700 dark:text-green-400">
                <Wifi className="w-3 h-3" /> Squad ativo
              </Badge>
            )}
            {status === 'offline' && (
              <Badge variant="secondary" className="gap-1.5 bg-red-500/15 text-red-700 dark:text-red-400">
                <WifiOff className="w-3 h-3" /> Dashboard offline
              </Badge>
            )}
            {status === 'online' && (
              <span className="text-xs text-muted-foreground hidden sm:block">{dashboardUrl}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {status === 'online' && (
              <>
                <Button variant="outline" size="sm" onClick={reload}>
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Recarregar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setFullscreen(f => !f)}>
                  <Maximize2 className="w-4 h-4 mr-1.5" /> {fullscreen ? 'Sair' : 'Tela cheia'}
                </Button>
                <a href={dashboardUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-1.5" /> Abrir
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Verificando */}
        {status === 'checking' && (
          <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/20">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin opacity-40" />
              <p className="text-sm">Procurando dashboard...</p>
            </div>
          </div>
        )}

        {/* Offline */}
        {status === 'offline' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 border rounded-lg bg-muted/20">
            <WifiOff className="w-12 h-12 text-muted-foreground opacity-40" />
            <div className="text-center space-y-1">
              <p className="font-medium">Dashboard do Squad offline</p>
              <p className="text-sm text-muted-foreground">Inicie o dashboard para visualizar os agentes trabalhando.</p>
            </div>
            <div className="bg-muted rounded-md px-4 py-2 text-xs font-mono text-muted-foreground">
              cd opensquad-master/dashboard && npm run dev
            </div>
            <Button variant="outline" size="sm" onClick={ping}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Tentar novamente
            </Button>
          </div>
        )}

        {/* Online — iframe só renderiza UMA vez quando URL está definida */}
        {status === 'online' && dashboardUrl && (
          <div className={`flex-1 border rounded-lg overflow-hidden ${fullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : ''}`}>
            {fullscreen && (
              <button
                onClick={() => setFullscreen(false)}
                className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-md px-3 py-1.5 text-xs hover:bg-black/80"
              >
                Sair da tela cheia
              </button>
            )}
            <iframe
              ref={iframeRef}
              src={dashboardUrl}
              className="w-full h-full border-0"
              title="Squad Dashboard"
              allow="*"
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
