import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsClientRole, useClientPortalAccess, useClientTimeline, useClientComments, useAddClientComment } from '@/hooks/useClientPortal';
import { useClients } from '@/hooks/useClients';
import { useAgencySettings } from '@/hooks/useAgencySettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, LogOut, CheckSquare, DollarSign, Lightbulb, MessageCircle, Send, Clock, AlertCircle, CheckCircle2, Circle, ArrowLeft, CalendarPlus, Phone, Megaphone, ShoppingCart, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { ClientPortalAlerts } from '@/components/portal/ClientPortalAlerts';
import { PortalNotificationBell } from '@/components/portal/PortalNotificationBell';
import { PortalAISummary } from '@/components/portal/PortalAISummary';
import { ScheduleMeetingDialog } from '@/components/portal/ScheduleMeetingDialog';
import { useCreatePortalAccessLog, useUpdatePortalAccessLog } from '@/hooks/usePortalAccessLogs';
import { useClientAnnouncements, useMarkAnnouncementRead } from '@/hooks/usePortalAnnouncements';
import { SalesPortalPanel } from '@/components/portal/SalesPortalPanel';
import { MetaAdsCard } from '@/components/clients/MetaAdsCard';

const taskStatusIcons: Record<string, React.ReactNode> = {
  'A Fazer': <Circle className="w-4 h-4 text-muted-foreground" />,
  'Fazendo': <Clock className="w-4 h-4 text-blue-500" />,
  'Atrasado': <AlertCircle className="w-4 h-4 text-destructive" />,
  'Concluído': <CheckCircle2 className="w-4 h-4 text-success" />,
};

const taskStatusLabels: Record<string, string> = {
  'A Fazer': 'A Fazer',
  'Fazendo': 'Em Andamento',
  'Atrasado': 'Atrasado',
  'Concluído': 'Concluído',
};

const financeStatusColors: Record<string, string> = {
  Pago: 'bg-success/10 text-success',
  Pendente: 'bg-warning/10 text-warning',
  Atrasado: 'bg-destructive/10 text-destructive',
};

const planningStatusColors: Record<string, string> = {
  Rascunho: 'bg-muted text-muted-foreground',
  'Em Aprovação': 'bg-warning/10 text-warning',
  Aprovado: 'bg-success/10 text-success',
  Ativo: 'bg-blue-500/10 text-blue-500',
  Pausado: 'bg-muted text-muted-foreground',
  Finalizado: 'bg-success/10 text-success',
};

interface TimelineTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface TimelineFinance {
  id: string;
  description: string | null;
  amount: number;
  due_date: string;
  status: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface TimelinePlanning {
  id: string;
  name: string;
  platform: string;
  objective: string | null;
  status: string;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

interface TimelineComment {
  id: string;
  entity_id: string;
  message: string;
  created_at: string;
}

type TimelineItem = {
  id: string;
  type: 'task' | 'finance' | 'planning';
  title: string;
  subtitle: string;
  status: string;
  statusColor: string;
  date: string;
  icon: React.ReactNode;
  rawDate: string;
};

export default function ClientPortalPage() {
  const { user, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: isClient, isLoading: loadingRole } = useIsClientRole();
  const { data: agencySettings } = useAgencySettings();

  // Admin mode: viewing a specific client's portal via ?client_id=
  const adminClientId = searchParams.get('client_id');
  const isAdminMode = !!adminClientId && !isClient;

  // Client mode: use portal access
  const { data: access, isLoading: loadingAccess } = useClientPortalAccess();

  // For admin mode, fetch client data from clients list
  const { data: allClients, isLoading: loadingClients } = useClients();
  const adminClient = isAdminMode ? allClients?.find(c => c.id === adminClientId) : null;

  const accessRecord = access as { client_id: string; clients: { name: string; company: string } } | null;
  const clientId = isAdminMode ? adminClientId! : accessRecord?.client_id;
  const clientData = isAdminMode ? adminClient : accessRecord?.clients;

  const { data: timeline, isLoading: loadingTimeline } = useClientTimeline(clientId);
  const { data: comments } = useClientComments(clientId);
  const addComment = useAddClientComment();
  const { data: announcements } = useClientAnnouncements(clientId);
  const markAnnouncementRead = useMarkAnnouncementRead();

  const [commentText, setCommentText] = useState('');
  const [commentTarget, setCommentTarget] = useState<{ entityType: string; entityId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'finance' | 'planning' | 'sales' | 'meta'>('all');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const createLog = useCreatePortalAccessLog();
  const updateLog = useUpdatePortalAccessLog();
  const logRef = useRef<{ id: string; startTime: number } | null>(null);

  // Track portal access session
  useEffect(() => {
    if (!clientId || !user || isAdminMode) return;

    const startTime = Date.now();
    createLog.mutateAsync({ client_id: clientId, user_id: user.id }).then(log => {
      logRef.current = { id: log.id, startTime };
    }).catch(() => {});

    const handleEnd = () => {
      if (logRef.current) {
        const duration = Math.round((Date.now() - logRef.current.startTime) / 1000);
        updateLog.mutate({
          id: logRef.current.id,
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
        });
        logRef.current = null;
      }
    };

    window.addEventListener('beforeunload', handleEnd);
    return () => {
      handleEnd();
      window.removeEventListener('beforeunload', handleEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, user?.id, isAdminMode]);

  const isLoading = loadingRole || loadingAccess || loadingTimeline || (isAdminMode && loadingClients);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Acesso ao portal não encontrado.</p>
            {isAdminMode ? (
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />Voltar
              </Button>
            ) : (
              <Button onClick={signOut} variant="outline">Sair</Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build timeline items
  const timelineItems: TimelineItem[] = [];

  if (timeline?.tasks) {
    (timeline.tasks as TimelineTask[]).forEach((t) => {
      timelineItems.push({
        id: t.id,
        type: 'task',
        title: t.title,
        subtitle: `${t.type} • ${t.priority}`,
        status: taskStatusLabels[t.status] || t.status,
        statusColor: t.status === 'Concluído' ? 'bg-success/10 text-success' :
          t.status === 'Atrasado' ? 'bg-destructive/10 text-destructive' :
          t.status === 'Fazendo' ? 'bg-blue-500/10 text-blue-500' :
          'bg-muted text-muted-foreground',
        date: t.due_date ? formatDate(t.due_date) : formatDate(t.created_at),
        icon: taskStatusIcons[t.status] || <Circle className="w-4 h-4" />,
        rawDate: t.updated_at || t.created_at,
      });
    });
  }

  if (timeline?.finance) {
    (timeline.finance as TimelineFinance[]).forEach((f) => {
      timelineItems.push({
        id: f.id,
        type: 'finance',
        title: f.description || (f.type === 'Receita' ? 'Receita' : 'Despesa'),
        subtitle: `${f.type} • ${formatCurrency(Number(f.amount))}`,
        status: f.status,
        statusColor: financeStatusColors[f.status] || 'bg-muted text-muted-foreground',
        date: formatDate(f.due_date),
        icon: <DollarSign className="w-4 h-4 text-success" />,
        rawDate: f.updated_at || f.created_at,
      });
    });
  }

  if (timeline?.planning) {
    (timeline.planning as TimelinePlanning[]).forEach((p) => {
      timelineItems.push({
        id: p.id,
        type: 'planning',
        title: p.name,
        subtitle: `${p.platform}${p.objective ? ' • ' + p.objective : ''}`,
        status: p.status,
        statusColor: planningStatusColors[p.status] || 'bg-muted text-muted-foreground',
        date: p.start_date ? formatDate(p.start_date) : formatDate(p.created_at),
        icon: <Lightbulb className="w-4 h-4 text-warning" />,
        rawDate: p.updated_at || p.created_at,
      });
    });
  }

  // Sort by date desc
  timelineItems.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

  const filteredItems = activeTab === 'all' ? timelineItems : timelineItems.filter(i => i.type === activeTab);

  const handleAddComment = async () => {
    if (!commentText.trim() || !commentTarget || !user) return;
    try {
      await addComment.mutateAsync({
        client_id: clientId,
        user_id: user.id,
        entity_type: commentTarget.entityType,
        entity_id: commentTarget.entityId,
        message: commentText.trim(),
      });
      setCommentText('');
      setCommentTarget(null);
      toast.success('Comentário adicionado!');
    } catch {
      toast.error('Erro ao adicionar comentário');
    }
  };

  const getCommentsForEntity = (entityId: string) => {
    return (comments as TimelineComment[])?.filter((c) => c.entity_id === entityId) || [];
  };

  const typeLabels = { task: 'Tarefa', finance: 'Financeiro', planning: 'Planejamento' };
  const typeIcons = {
    task: <CheckSquare className="w-4 h-4" />,
    finance: <DollarSign className="w-4 h-4" />,
    planning: <Lightbulb className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isAdminMode && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{clientData.company || clientData.name}</h1>
              <p className="text-sm text-muted-foreground">
                {isAdminMode ? 'Visualização do Portal do Cliente' : 'Área do Cliente'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PortalNotificationBell
              tasks={timeline?.tasks || []}
              finance={timeline?.finance || []}
              planning={timeline?.planning || []}
            />
            {!isAdminMode && (
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowScheduleDialog(true)}
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Agendar Reunião
          </Button>
          <Button
            className="flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white"
            onClick={() => {
              const phone = agencySettings?.phone;
              if (phone) {
                const cleanPhone = phone.replace(/\D/g, '');
                window.open(`https://wa.me/${cleanPhone}`, '_blank');
              } else {
                toast.info('Telefone da agência não configurado.');
              }
            }}
          >
            <Phone className="w-4 h-4 mr-2" />
            Chamar no WhatsApp
          </Button>
        </div>

        {/* AI Summary — only on "all" tab */}
        {activeTab === 'all' && (
          <PortalAISummary
            clientId={clientId}
            clientName={clientData.company || clientData.name}
            tasks={timeline?.tasks || []}
            finance={timeline?.finance || []}
            planning={timeline?.planning || []}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'tasks', 'finance', 'planning', 'sales', 'meta'] as const).map(tab => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="shrink-0"
            >
              {tab === 'all' && 'Tudo'}
              {tab === 'tasks' && <><CheckSquare className="w-3.5 h-3.5 mr-1.5" />Tarefas</>}
              {tab === 'finance' && <><DollarSign className="w-3.5 h-3.5 mr-1.5" />Financeiro</>}
              {tab === 'planning' && <><Lightbulb className="w-3.5 h-3.5 mr-1.5" />Planejamentos</>}
              {tab === 'sales' && <><ShoppingCart className="w-3.5 h-3.5 mr-1.5" />Vendas</>}
              {tab === 'meta' && <><TrendingUp className="w-3.5 h-3.5 mr-1.5" />Meta Ads</>}
            </Button>
          ))}
        </div>

        {/* Announcements */}
        {activeTab === 'all' && announcements && announcements.length > 0 && (
          <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg shadow-primary/10 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/15">
                  <Megaphone className="w-4 h-4 text-primary" />
                </div>
                Avisos Importantes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {announcements.map(ann => (
                <div
                  key={ann.id}
                  className="flex items-start gap-3 px-4 py-3 rounded-lg bg-background/60 border border-primary/15"
                >
                  <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{ann.title}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">{ann.message}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 h-7 text-xs"
                      onClick={() => markAnnouncementRead.mutate(ann.id)}
                      disabled={markAnnouncementRead.isPending}
                    >
                      Entendido ✓
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sales Panel */}
        {activeTab === 'sales' && <SalesPortalPanel clientId={clientId} />}

        {/* Meta Ads Panel */}
        {activeTab === 'meta' && (
          <MetaAdsCard clientId={clientId} />
        )}

        {/* Summary Cards */}
        {activeTab !== 'sales' && activeTab !== 'meta' && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{timeline?.tasks?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Tarefas</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">
                {(timeline?.tasks as TimelineTask[])?.filter((t) => t.status === 'Concluído').length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{timeline?.planning?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Planejamentos</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">
                {(timeline?.finance as TimelineFinance[])?.filter((f) => f.status === 'Pendente').length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
        </div>}

        {/* Timeline */}
        {activeTab !== 'sales' && activeTab !== 'meta' && <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Linha do Tempo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma atividade encontrada.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredItems.map(item => {
                  const itemComments = getCommentsForEntity(item.id);
                  const isCommenting = commentTarget?.entityId === item.id;

                  return (
                    <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1.5 rounded-lg bg-muted/50">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground truncate">{item.title}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {typeLabels[item.type]}
                            </Badge>
                            <Badge className={`text-[10px] px-1.5 py-0 ${item.statusColor}`}>
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{item.subtitle}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.date}</p>

                          {/* Comments */}
                          {itemComments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {(itemComments as TimelineComment[]).map((c) => (
                                <div key={c.id} className="bg-muted/50 rounded-lg p-2 text-sm">
                                  <p className="text-foreground">{c.message}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(c.created_at)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Comment input */}
                          {isCommenting ? (
                            <div className="mt-2 flex gap-2">
                              <Input
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                placeholder="Escreva um comentário..."
                                className="flex-1 h-8 text-sm"
                                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                              />
                              <Button size="sm" onClick={handleAddComment} disabled={addComment.isPending} className="h-8">
                                <Send className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setCommentTarget({ entityType: item.type, entityId: item.id })}
                              className="mt-2 text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" />
                              Comentar
                              {itemComments.length > 0 && ` (${itemComments.length})`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>}
      </main>

      <ScheduleMeetingDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        clientId={clientId}
        clientName={clientData.company || clientData.name}
      />
    </div>
  );
}
