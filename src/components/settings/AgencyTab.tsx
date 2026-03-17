import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAgencySettings, useUpdateAgencySettings } from '@/hooks/useAgencySettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Upload, X, Loader2, Building2, ShieldAlert } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function AgencyTab() {
  const { data: settings, isLoading } = useAgencySettings();
  const update = useUpdateAgencySettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is admin
  const { data: isAdmin, isLoading: loadingRole } = useQuery({
    queryKey: ['user-is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    name: '',
    logo_url: '',
    cnpj: '',
    monthly_revenue_goal: 0,
    monthly_profit_goal: 0,
    main_bank_account: '',
    currency: 'BRL',
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || '',
        logo_url: settings.logo_url || '',
        cnpj: settings.cnpj || '',
        monthly_revenue_goal: settings.monthly_revenue_goal || 0,
        monthly_profit_goal: settings.monthly_profit_goal || 0,
        main_bank_account: settings.main_bank_account || '',
        currency: settings.currency || 'BRL',
        address: settings.address || '',
        city: settings.city || '',
        state: settings.state || '',
        zip_code: settings.zip_code || '',
      });
    }
  }, [settings]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      const fileName = `agency-logo-${Date.now()}.${fileExt}`;
      const filePath = `agency/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setForm((f) => ({ ...f, logo_url: publicUrl }));
      toast({ title: 'Logo enviado com sucesso!' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar logo', description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setForm((f) => ({ ...f, logo_url: '' }));
  };

  const handleCNPJChange = (value: string) => {
    setForm((f) => ({ ...f, cnpj: formatCNPJ(value) }));
  };

  const handleSave = () => {
    if (!settings) return;
    update.mutate({ id: settings.id, ...form });
  };

  if (isLoading || loadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <ShieldAlert className="w-10 h-10 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Acesso restrito</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Apenas administradores podem editar as configurações da agência.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const initials = form.name
    ? form.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AG';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Dados da agência</CardTitle>
        </div>
        <CardDescription>Identidade e informações cadastrais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Logo upload */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 ring-2 ring-border">
            <AvatarImage src={form.logo_url} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
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
                <><Upload className="w-4 h-4 mr-1.5" />{form.logo_url ? 'Alterar' : 'Enviar'} logo</>
              )}
            </Button>
            {form.logo_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveLogo}
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
          <Label>Nome da agência</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input
            value={form.cnpj}
            onChange={(e) => handleCNPJChange(e.target.value)}
            placeholder="00.000.000/0000-00"
            maxLength={18}
          />
        </div>
        <div className="space-y-2">
          <Label>Conta bancária principal</Label>
          <Input
            value={form.main_bank_account}
            onChange={(e) => setForm((f) => ({ ...f, main_bank_account: e.target.value }))}
            placeholder="Banco, Agência, Conta"
          />
        </div>

        <Separator />

        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">Endereço</span>
        </div>
        <div className="space-y-2">
          <Label>Endereço</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Rua, número, complemento"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Cidade"
            />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Input
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              placeholder="UF"
              maxLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label>CEP</Label>
            <Input
              value={form.zip_code}
              onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))}
              placeholder="00000-000"
              maxLength={9}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Moeda padrão</Label>
          <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BRL">BRL - Real</SelectItem>
              <SelectItem value="USD">USD - Dólar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={update.isPending} className="w-full sm:w-auto">
          {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
          Salvar configurações
        </Button>
      </CardContent>
    </Card>
  );
}
