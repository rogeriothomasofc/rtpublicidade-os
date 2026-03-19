import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, KeyRound, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientEmail?: string;
}

function genPassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export function InviteClientDialog({ open, onOpenChange, clientId, clientName, clientEmail }: InviteClientDialogProps) {
  const [email, setEmail] = useState(clientEmail || '');
  const [password, setPassword] = useState(genPassword);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => setPassword(genPassword());

  const handleInvite = async () => {
    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-client', {
        body: { client_id: clientId, email, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setSuccess(true);
      if (data?.email_sent) {
        toast.success('Convite criado e email enviado com sucesso!');
      } else {
        toast.success('Convite criado! Email não enviado (configure SMTP em Integrações).');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao convidar cliente';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    navigator.clipboard.writeText(`Email: ${email}\nSenha: ${password}\nAcesso: ${window.location.origin}/portal`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Credenciais copiadas!');
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSuccess(false);
      setPassword(genPassword());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar {clientName} para o Portal</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-success">Acesso criado com sucesso!</p>
              <p className="text-muted-foreground">Compartilhe as credenciais abaixo com o cliente:</p>
              <div className="bg-card rounded p-3 space-y-1 text-foreground">
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Senha:</strong> {password}</p>
                <p><strong>Link:</strong> {window.location.origin}/portal</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyCredentials} className="flex-1">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copiado!' : 'Copiar credenciais'}
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>Fechar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email do cliente</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="pl-10"
                  type="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Senha temporária</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Senha de acesso"
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={generatePassword} type="button">Gerar</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O cliente usará "Primeiro Acesso" para definir uma nova senha.
              </p>
            </div>
            <Button onClick={handleInvite} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Enviar Convite
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
