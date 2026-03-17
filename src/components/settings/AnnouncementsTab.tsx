import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePortalAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '@/hooks/usePortalAnnouncements';
import { useClients } from '@/hooks/useClients';
import { Megaphone, Plus, Trash2, Users, User, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export function AnnouncementsTab() {
  const { data: announcements, isLoading } = usePortalAnnouncements();
  const { data: clients } = useClients();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<string>('all');

  const activeClients = clients?.filter(c => c.status === 'Ativo') || [];

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) return;
    
    if (target === 'all') {
      await createAnnouncement.mutateAsync({
        title: title.trim(),
        message: message.trim(),
        is_global: true,
        client_id: null,
      });
    } else {
      await createAnnouncement.mutateAsync({
        title: title.trim(),
        message: message.trim(),
        is_global: false,
        client_id: target,
      });
    }
    
    setTitle('');
    setMessage('');
    setTarget('all');
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Avisos do Portal
          </h2>
          <p className="text-sm text-muted-foreground">
            Envie notificações para o portal dos clientes
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Aviso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Aviso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Destinatário</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Todos os Clientes
                      </span>
                    </SelectItem>
                    {activeClients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        <span className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {client.name} — {client.company}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Título</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Atualização de serviços"
                />
              </div>

              <div>
                <Label>Mensagem</Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Escreva o conteúdo do aviso..."
                  rows={4}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!title.trim() || !message.trim() || createAnnouncement.isPending}
              >
                {createAnnouncement.isPending ? 'Enviando...' : 'Enviar Aviso'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {announcements && announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map(ann => (
            <Card key={ann.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{ann.title}</h3>
                      {ann.is_global ? (
                        <Badge variant="secondary" className="text-[10px]">
                          <Globe className="w-3 h-3 mr-1" />
                          Todos
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          <User className="w-3 h-3 mr-1" />
                          {ann.client?.name || 'Cliente'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {format(new Date(ann.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteAnnouncement.mutate(ann.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Nenhum aviso enviado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Novo Aviso" para enviar uma notificação aos clientes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
