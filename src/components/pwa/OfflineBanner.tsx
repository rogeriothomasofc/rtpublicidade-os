import { WifiOff } from 'lucide-react';
import { usePWAContext } from './PWAProvider';

export function OfflineBanner() {
  const { isOnline } = usePWAContext();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOff className="w-4 h-4" />
        <span>Você está offline. Algumas funcionalidades podem não estar disponíveis.</span>
      </div>
    </div>
  );
}
