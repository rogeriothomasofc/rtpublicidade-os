import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTeamMembers, useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember, TeamMember } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Users, Loader2, KeyRound, UsersRound } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { AvatarUpload } from '@/components/team/AvatarUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function TeamPage() {
  const { data: members, isLoading } = useTeamMembers();
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [creatingAccess, setCreatingAccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    avatar_url: '',
  });

  const [grantAccess, setGrantAccess] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [accessLevel, setAccessLevel] = useState<'Gestor' | 'Analista' | 'Criativo'>('Analista');

  const resetForm = () => {
    setFormData({ name: '', email: '', role: '', avatar_url: '' });
    setGrantAccess(false);
    setTempPassword('');
    setAccessLevel('Analista');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setFormData({
      name: member.name,
      email: member.email || '',
      role: member.role || '',
      avatar_url: member.avatar_url || '',
    });
    setEditingMember(member);
  };

  const handleCreateSubmit = async () => {
    if (grantAccess) {
      if (!formData.email.trim()) {
        toast({ title: 'Email obrigatório', description: 'Informe o email para criar acesso ao sistema.', variant: 'destructive' });
        return;
      }
      if (tempPassword.length < 6) {
        toast({ title: 'Senha inválida', description: 'A senha temporária deve ter no mínimo 6 caracteres.', variant: 'destructive' });
        return;
      }

      setCreatingAccess(true);
      try {
        // First create team member
        const newMember = await createMember.mutateAsync({
          name: formData.name,
          email: formData.email,
          role: formData.role || null,
          avatar_url: formData.avatar_url || null,
          is_active: true,
        });

        // Then create auth user via edge function
        const { data, error } = await supabase.functions.invoke('create-member-user', {
          body: {
            email: formData.email,
            password: tempPassword,
            name: formData.name,
            role: formData.role || null,
            access_level: accessLevel,
            team_member_id: newMember.id,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast({
          title: 'Membro cadastrado com acesso!',
          description: `Senha temporária: ${tempPassword} — o membro deve alterar no primeiro acesso.`,
        });
      } catch (err: any) {
        toast({ title: 'Erro ao criar acesso', description: err.message, variant: 'destructive' });
      } finally {
        setCreatingAccess(false);
      }
    } else {
      await createMember.mutateAsync({
        name: formData.name,
        email: formData.email || null,
        role: formData.role || null,
        avatar_url: formData.avatar_url || null,
        is_active: true,
      });
    }

    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleEditSubmit = async () => {
    if (!editingMember) return;
    await updateMember.mutateAsync({
      id: editingMember.id,
      name: formData.name,
      email: formData.email || null,
      role: formData.role || null,
      avatar_url: formData.avatar_url || null,
    });
    resetForm();
    setEditingMember(null);
  };

  const handleDelete = async (id: string) => {
    await deleteMember.mutateAsync(id);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isSubmitting = createMember.isPending || creatingAccess;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Equipe</h1>
              <p className="text-muted-foreground">Gerenciamento de membros</p>
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Equipe</h1>
            <p className="text-muted-foreground">
              {members?.length || 0} membro{members?.length !== 1 ? 's' : ''} ativo{members?.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4" />
                Novo Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Membro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label>Email {grantAccess && '*'}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Cargo / Função</Label>
                  <Input
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Ex: Designer, Gestor de Tráfego"
                  />
                </div>
                <AvatarUpload
                  currentUrl={formData.avatar_url || null}
                  name={formData.name}
                  onUpload={(url) => setFormData({ ...formData, avatar_url: url })}
                  onRemove={() => setFormData({ ...formData, avatar_url: '' })}
                />

                {/* Grant system access */}
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="grant-access"
                      checked={grantAccess}
                      onCheckedChange={(checked) => setGrantAccess(checked === true)}
                    />
                    <Label htmlFor="grant-access" className="flex items-center gap-2 cursor-pointer">
                      <KeyRound className="w-4 h-4 text-primary" />
                      Criar acesso ao sistema
                    </Label>
                  </div>
                  {grantAccess && (
                    <div className="space-y-3 pl-6">
                      <div className="space-y-2">
                        <Label>Nível de acesso *</Label>
                        <Select
                          value={accessLevel}
                          onValueChange={(v) => setAccessLevel(v as typeof accessLevel)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Gestor">Gestor — acesso total</SelectItem>
                            <SelectItem value="Analista">Analista — acesso operacional</SelectItem>
                            <SelectItem value="Criativo">Criativo — só tarefas e planejamentos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Senha temporária *</Label>
                        <Input
                          type="text"
                          value={tempPassword}
                          onChange={(e) => setTempPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                        />
                        <p className="text-xs text-muted-foreground">
                          O membro usará essa senha no "Primeiro Acesso" para definir sua senha definitiva.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateSubmit}
                  disabled={isSubmitting || !formData.name.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      Criando...
                    </>
                  ) : (
                    'Adicionar'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membros da Equipe
            </CardTitle>
            <CardDescription>
              Gerencie os membros que podem ser atribuídos às tarefas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {members && members.length > 0 ? (
              <div className="overflow-x-auto">
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatar_url || undefined} alt={member.name} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.email || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.role || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O membro "{member.name}" será desativado e não aparecerá mais na lista de responsáveis.
                                  As atribuições existentes serão mantidas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            ) : (
              <EmptyState
                icon={UsersRound}
                title="Nenhum membro na equipe"
                description="Adicione membros para atribuir responsáveis às tarefas e projetos."
                actionLabel="+ Adicionar Membro"
                onAction={() => setIsCreateDialogOpen(true)}
              />
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Membro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label>Cargo / Função</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="Ex: Designer, Gestor de Tráfego"
                />
              </div>
              <AvatarUpload
                currentUrl={formData.avatar_url || null}
                name={formData.name}
                onUpload={(url) => setFormData({ ...formData, avatar_url: url })}
                onRemove={() => setFormData({ ...formData, avatar_url: '' })}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleEditSubmit}
                disabled={updateMember.isPending || !formData.name.trim()}
              >
                {updateMember.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
