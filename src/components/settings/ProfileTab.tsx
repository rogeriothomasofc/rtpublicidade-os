import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Save, LogOut, Upload, X, Loader2, KeyRound, User as UserIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function ProfileTab() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: '',
    avatar_url: '',
  });
  const [passwords, setPasswords] = useState({ newPass: '', confirm: '' });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoading(true);
      const [{ data: profile }, { data: member }] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url, role').eq('user_id', user.id).single(),
        supabase.from('team_members').select('name, role').eq('email', user.email).maybeSingle(),
      ]);

      setForm({
        name: profile?.name || member?.name || '',
        email: user.email || '',
        role: profile?.role || member?.role || '',
        avatar_url: profile?.avatar_url || '',
      });
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Por favor, selecione uma imagem', variant: 'destructive' });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: 'A imagem deve ter no máximo 3MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setForm((f) => ({ ...f, avatar_url: publicUrl }));

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      toast({ title: 'Foto atualizada com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao enviar foto', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setForm((f) => ({ ...f, avatar_url: '' }));
    await supabase
      .from('profiles')
      .update({ avatar_url: '' })
      .eq('user_id', user.id);
    toast({ title: 'Foto removida' });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        name: form.name,
        role: form.role,
        avatar_url: form.avatar_url,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Perfil salvo', description: 'Suas informações foram atualizadas.' });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwords.newPass !== passwords.confirm) {
      toast({ title: 'Senhas não conferem', variant: 'destructive' });
      return;
    }
    if (passwords.newPass.length < 6) {
      toast({ title: 'A nova senha deve ter no mínimo 6 caracteres', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: passwords.newPass,
    });

    if (error) {
      toast({ title: 'Erro ao alterar senha', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha alterada com sucesso' });
      setPasswords({ newPass: '', confirm: '' });
    }
  };

  const handleLogoutAll = async () => {
    await signOut();
    toast({ title: 'Logout realizado', description: 'Sessão encerrada.' });
  };

  const initials = form.name
    ? form.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Informações pessoais</CardTitle>
          </div>
          <CardDescription>Gerencie seu perfil e dados de contato</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-2 ring-border">
              <AvatarImage src={form.avatar_url} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Enviando...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-1.5" />{form.avatar_url ? 'Alterar' : 'Enviar'} foto</>
                )}
              </Button>
              {form.avatar_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  className="text-destructive hover:text-destructive h-7 px-2"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Remover
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">JPG, PNG ou GIF. Máximo 3MB.</p>

          <Separator />

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Input
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Ex: Gestor de tráfego"
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
            Salvar perfil
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Alterar senha</CardTitle>
            </div>
            <CardDescription>Defina uma nova senha para sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={passwords.newPass}
                onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button onClick={handleChangePassword} className="w-full sm:w-auto">
              <KeyRound className="w-4 h-4 mr-1.5" />
              Alterar senha
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-destructive" />
              <CardTitle className="text-lg">Sessão</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleLogoutAll}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Sair da conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
