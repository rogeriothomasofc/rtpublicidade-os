import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAContext } from './PWAProvider';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, install } = usePWAContext();
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Show prompt after a delay if can install
  useEffect(() => {
    if (canInstall && !isInstalled && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled, dismissed]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      toast.success('App instalado com sucesso!', {
        description: 'Acesse o Agency OS diretamente da sua tela inicial.',
      });
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    // Don't show again for 24 hours
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Check if was recently dismissed
  useEffect(() => {
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (parseInt(dismissedAt) > dayAgo) {
        setDismissed(true);
      }
    }
  }, []);

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Instalar Agency OS</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acesse mais rápido direto da sua tela inicial
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleInstall} className="flex-1">
                Instalar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
