import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, Loader2, AlertCircle, ExternalLink, Mail, KeyRound, LayoutDashboard } from 'lucide-react';

type PersonType = 'pf' | 'pj';

interface FormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  person_type: PersonType;
  cpf: string;
  rg: string;
  cnpj: string;
  razao_social: string;
  inscricao_estadual: string;
  zip_code: string;
  address: string;
  city: string;
  state: string;
  instagram_username: string;
}

const EDGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-self-update`;
const PORTAL_URL = `${window.location.origin}/portal`;

export default function ClientSelfUpdatePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [formData, setFormData] = useState<FormData>({
    name: '', company: '', email: '', phone: '',
    person_type: 'pj', cpf: '', rg: '', cnpj: '',
    razao_social: '', inscricao_estadual: '', zip_code: '',
    address: '', city: '', state: '', instagram_username: '',
  });

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    fetch(`${EDGE_FN}?token=${token}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); return; }
        setFormData({
          name: data.name ?? '',
          company: data.company ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          person_type: (data.person_type as PersonType) ?? 'pj',
          cpf: data.cpf ?? '',
          rg: data.rg ?? '',
          cnpj: data.cnpj ?? '',
          razao_social: data.razao_social ?? '',
          inscricao_estadual: data.inscricao_estadual ?? '',
          zip_code: data.zip_code ?? '',
          address: data.address ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          instagram_username: data.instagram_username ?? '',
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(EDGE_FN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ token, ...formData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setClientEmail(formData.email);
      setSuccess(true);
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-3">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-lg font-semibold">Link inválido ou expirado</p>
            <p className="text-sm text-muted-foreground">Entre em contato com a agência para solicitar um novo link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 space-y-5">
            <div className="text-center space-y-2">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
              <p className="text-xl font-bold">Cadastro concluído!</p>
              <p className="text-sm text-muted-foreground">Seus dados foram enviados com sucesso.</p>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <p className="text-sm font-semibold">Como acessar o Painel do Cliente:</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>A agência enviará um email{clientEmail ? <> para <strong className="text-foreground">{clientEmail}</strong></> : ''} com suas credenciais de acesso.</span>
                </div>
                <div className="flex items-start gap-2">
                  <KeyRound className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>No email você encontrará sua <strong className="text-foreground">senha temporária</strong>. Use-a junto com seu email para entrar no painel.</span>
                </div>
                <div className="flex items-start gap-2">
                  <LayoutDashboard className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>No painel você acompanha tarefas, relatórios financeiros, planejamentos e muito mais.</span>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => window.open(PORTAL_URL, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Acessar Painel do Cliente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Complete seu Cadastro</CardTitle>
          <p className="text-sm text-muted-foreground">Preencha seus dados para começar. Essas informações são necessárias para a agência trabalhar com você.</p>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">

          {/* Nome + Empresa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input value={formData.name} onChange={set('name')} placeholder="Seu nome" />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input value={formData.company} onChange={set('company')} placeholder="Nome da empresa" />
            </div>
          </div>

          {/* Email + Telefone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={set('email')} placeholder="seu@email.com" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={formData.phone} onChange={set('phone')} placeholder="(11) 99999-9999" />
            </div>
          </div>

          {/* Instagram */}
          <div>
            <Label>Instagram</Label>
            <Input value={formData.instagram_username} onChange={set('instagram_username')} placeholder="@seuperfil" />
          </div>

          {/* Tipo de Pessoa */}
          <div>
            <Label>Tipo de Pessoa</Label>
            <RadioGroup
              value={formData.person_type}
              onValueChange={(v: PersonType) => setFormData(prev => ({ ...prev, person_type: v }))}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pf" id="pf" />
                <Label htmlFor="pf" className="cursor-pointer">Pessoa Física</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pj" id="pj" />
                <Label htmlFor="pj" className="cursor-pointer">Pessoa Jurídica</Label>
              </div>
            </RadioGroup>
          </div>

          {/* PF: CPF + RG */}
          {formData.person_type === 'pf' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CPF</Label>
                <Input value={formData.cpf} onChange={set('cpf')} placeholder="000.000.000-00" maxLength={14} />
              </div>
              <div>
                <Label>RG</Label>
                <Input value={formData.rg} onChange={set('rg')} placeholder="00.000.000-0" />
              </div>
            </div>
          )}

          {/* PJ: CNPJ + Razão Social */}
          {formData.person_type === 'pj' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CNPJ</Label>
                <Input value={formData.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0000-00" maxLength={18} />
              </div>
              <div>
                <Label>Razão Social</Label>
                <Input value={formData.razao_social} onChange={set('razao_social')} placeholder="Razão social" />
              </div>
            </div>
          )}

          {/* Inscrição Estadual (só PJ) */}
          {formData.person_type === 'pj' && (
            <div>
              <Label>Inscrição Estadual</Label>
              <Input value={formData.inscricao_estadual} onChange={set('inscricao_estadual')} placeholder="Inscrição estadual" />
            </div>
          )}

          {/* CEP */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CEP</Label>
              <Input value={formData.zip_code} onChange={set('zip_code')} placeholder="00000-000" maxLength={9} />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <Label>Endereço</Label>
            <Input value={formData.address} onChange={set('address')} placeholder="Rua, número, complemento" />
          </div>

          {/* Cidade + Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cidade</Label>
              <Input value={formData.city} onChange={set('city')} placeholder="Cidade" />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={formData.state} onChange={set('state')} placeholder="UF" maxLength={2} />
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : 'Concluir Cadastro'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
