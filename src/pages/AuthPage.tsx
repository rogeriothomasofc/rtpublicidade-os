import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, KeyRound } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').max(128),
});

const firstAccessSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255),
  tempPassword: z.string().min(6, 'A senha temporária deve ter no mínimo 6 caracteres').max(128),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres').max(128),
});

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'first-access'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = loginSchema.parse({ email, password });
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.email,
        password: parsed.password,
      });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({ title: 'Credenciais inválidas', description: 'Verifique seu email e senha.', variant: 'destructive' });
        } else {
          throw error;
        }
      } else {
        navigate('/');
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast({ title: 'Erro de validação', description: err.errors[0].message, variant: 'destructive' });
      } else {
        toast({ title: 'Erro', description: err.message || 'Algo deu errado.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = firstAccessSchema.parse({ email, tempPassword: password, newPassword: confirm });

      // Sign in with the temporary password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.email,
        password: parsed.tempPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          toast({
            title: 'Credenciais inválidas',
            description: 'Verifique seu email e a senha temporária fornecida pelo administrador.',
            variant: 'destructive',
          });
        } else {
          throw signInError;
        }
        return;
      }

      // Update to the new password chosen by the member
      const { error: updateError } = await supabase.auth.updateUser({
        password: parsed.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      toast({ title: 'Senha definida com sucesso!', description: 'Bem-vindo ao Agency OS.' });
      navigate('/');
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast({ title: 'Erro de validação', description: err.errors[0].message, variant: 'destructive' });
      } else {
        toast({ title: 'Erro', description: err.message || 'Algo deu errado.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setConfirm('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-2">
            <span className="text-primary-foreground font-bold text-xl">S</span>
          </div>
          <CardTitle className="text-2xl">
            {tab === 'login' ? 'Entrar no Agency OS' : 'Primeiro Acesso'}
          </CardTitle>
          <CardDescription>
            {tab === 'login'
              ? 'Faça login para acessar o painel'
              : 'Defina sua senha usando o email e a senha temporária do administrador'}
          </CardDescription>

          <div className="flex rounded-lg border border-border overflow-hidden mt-2">
            <button
              type="button"
              onClick={() => { setTab('login'); resetFields(); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'login'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setTab('first-access'); resetFields(); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'first-access'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Primeiro Acesso
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Entrar
              </Button>
            </form>
          ) : (
            <form onSubmit={handleFirstAccess} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fa-email">Email</Label>
                <Input
                  id="fa-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email cadastrado pelo admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fa-temp">Senha temporária</Label>
                <Input
                  id="fa-temp"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Fornecida pelo administrador"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fa-new">Nova senha</Label>
                <Input
                  id="fa-new"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <KeyRound className="w-4 h-4 mr-2" />
                )}
                Definir senha e entrar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
