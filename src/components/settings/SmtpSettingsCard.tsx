import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Send, Settings, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSmtpSettings, useSaveSmtpSettings } from '@/hooks/useSmtpSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SmtpSettingsCard() {
  const { data: smtp, isLoading } = useSmtpSettings();
  const save = useSaveSmtpSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    encryption: 'tls',
    is_active: true,
  });

  const handleOpen = () => {
    if (smtp) {
      setForm({
        host: smtp.host,
        port: smtp.port,
        username: smtp.username,
        password: smtp.password,
        from_email: smtp.from_email,
        from_name: smtp.from_name,
        encryption: smtp.encryption,
        is_active: smtp.is_active,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.host || !form.username || !form.password || !form.from_email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    save.mutate(form, { onSuccess: () => setDialogOpen(false) });
  };

  const handleTest = async () => {
    if (!form.host || !form.from_email) {
      toast.error('Preencha o servidor e o email remetente antes de testar');
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-client-email', {
        body: {
          to_email: form.from_email,
          to_name: 'Teste',
          subject: 'Teste de configuração SMTP',
          html_body: '<h2>Teste SMTP</h2><p>Se você recebeu este email, a configuração está funcionando corretamente! ✅</p>',
          smtp_config: {
            host: form.host,
            port: form.port,
            username: form.username,
            password: form.password,
            from_email: form.from_email,
            from_name: form.from_name,
            encryption: form.encryption,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Email de teste enviado! Verifique sua caixa de entrada.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar teste';
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const isConnected = smtp?.is_active === true;

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">Email SMTP</span>
                    <Badge variant={isConnected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                      {isConnected ? 'Conectado' : 'Disponível'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Envie emails de acesso ao portal do cliente automaticamente
                  </p>
                  {isConnected && smtp && (
                    <p className="text-xs text-muted-foreground truncate">
                      Remetente: {smtp.from_name ? `${smtp.from_name} <${smtp.from_email}>` : smtp.from_email}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isConnected ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpen}>
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpen}>
                        Conectado
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="gap-1.5" onClick={handleOpen}>
                      Conectar
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar SMTP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Servidor SMTP *</Label>
                <Input
                  value={form.host}
                  onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Porta *</Label>
                <Input
                  type="number"
                  value={form.port}
                  onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
                  placeholder="587"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuário *</Label>
                <Input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email remetente *</Label>
                <Input
                  value={form.from_email}
                  onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))}
                  placeholder="contato@agencia.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome remetente</Label>
                <Input
                  value={form.from_name}
                  onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))}
                  placeholder="Minha Agência"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Criptografia</Label>
                <Select value={form.encryption} onValueChange={v => setForm(f => ({ ...f, encryption: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS (587)</SelectItem>
                    <SelectItem value="ssl">SSL (465)</SelectItem>
                    <SelectItem value="none">Nenhuma (25)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ativo</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <span className="text-sm text-muted-foreground">{form.is_active ? 'Sim' : 'Não'}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Para Gmail, use "Senhas de App" em vez da senha normal. Para Outlook, ative o acesso SMTP nas configurações.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Enviar teste
            </Button>
            <Button onClick={handleSave} disabled={save.isPending}>
              {save.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
