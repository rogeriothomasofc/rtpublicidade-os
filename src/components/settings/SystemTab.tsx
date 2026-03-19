import { useState } from 'react';
import { RefreshCw, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { APP_VERSION } from '@/lib/version';
import { usePWAContext } from '@/components/pwa/PWAProvider';

export function SystemTab() {
  const { needRefresh, update } = usePWAContext();
  const [checked, setChecked] = useState(false);

  const handleCheck = () => {
    setChecked(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
            ) : checked ? (
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
            <Button variant="outline" onClick={handleCheck} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {checked ? 'Verificado — nenhuma atualização disponível' : 'Verificar atualização'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
