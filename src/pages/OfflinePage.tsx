import { WifiOff, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Você está offline</h1>
        <p className="text-muted-foreground mb-8">
          Parece que você perdeu a conexão com a internet. Verifique sua conexão e tente novamente.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRefresh} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/">
              <Home className="w-4 h-4" />
              Página inicial
            </Link>
          </Button>
        </div>

        <div className="mt-12 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Dica:</strong> O Agency OS funciona offline para dados já carregados. 
            Novas ações serão sincronizadas quando você voltar online.
          </p>
        </div>
      </div>
    </div>
  );
}
