import { X, MonitorSmartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAContext } from './PWAProvider';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, install } = usePWAContext();
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (canInstall && !isInstalled && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
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
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

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
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-xl px-4 py-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <MonitorSmartphone className="w-5 h-5 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-none">Instalar Agency OS</p>
          <p className="text-xs text-white/50 mt-1 leading-none">Acesso rápido pela tela inicial</p>
        </div>

        {/* Install button */}
        <Button
          size="sm"
          onClick={handleInstall}
          className="shrink-0 h-8 px-4 rounded-xl bg-white text-black hover:bg-white/90 font-medium text-sm"
        >
          Instalar
        </Button>

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="shrink-0 text-white/40 hover:text-white/80 transition-colors p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
