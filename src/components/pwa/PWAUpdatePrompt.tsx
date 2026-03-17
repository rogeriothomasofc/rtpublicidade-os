import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePWAContext } from './PWAProvider';

export function PWAUpdatePrompt() {
  const { needRefresh, update, dismissUpdate } = usePWAContext();

  return (
    <Dialog open={needRefresh} onOpenChange={(open) => !open && dismissUpdate()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Nova versão disponível
          </DialogTitle>
          <DialogDescription>
            Uma nova versão do Agency OS está disponível. Atualize agora para ter acesso às
            últimas funcionalidades e correções.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={dismissUpdate}>
            Depois
          </Button>
          <Button onClick={update} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
