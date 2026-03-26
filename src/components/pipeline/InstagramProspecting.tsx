import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Instagram,
  Search,
  Sparkles,
  Copy,
  MessageCircle,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  Globe,
  Phone,
  Mail,
  Loader2,
  Plus,
  TrendingUp,
  FileText,
  Lightbulb,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useInstagramProspects,
  useCreateProspect,
  useUpdateProspect,
  useDeleteProspect,
  analyzeInstagramProspect,
  PROSPECT_STATUSES,
  STATUS_COLORS,
  type InstagramProspect,
  type ProspectStatus,
} from '@/hooks/useInstagramProspects';

const STATUS_LABELS: Record<ProspectStatus, string> = {
  'Identificado': 'Identificado',
  'Mensagem Enviada': 'Msg Enviada',
  'Respondeu': 'Respondeu',
  'Reunião Marcada': 'Reunião',
  'Proposta Enviada': 'Proposta',
  'Ganho': 'Ganho',
  'Perdido': 'Perdido',
};

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiado!`);
}

function openInstagramConversation(username: string) {
  window.open(`https://ig.me/m/${username}`, '_blank');
}

function sendWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/55${clean}?text=${encoded}`, '_blank');
}

interface AddProspectFormProps {
  onClose: () => void;
}

function AddProspectForm({ onClose }: AddProspectFormProps) {
  const createProspect = useCreateProspect();
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    followers_count: '',
    following_count: '',
    posts_count: '',
    niche: '',
    website: '',
    whatsapp: '',
    email: '',
  });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleAnalyzeAndSave = async () => {
    if (!form.username.trim()) {
      toast.error('Informe o @username do perfil');
      return;
    }
    setAnalyzing(true);
    try {
      const input = {
        username: form.username.replace('@', '').trim(),
        full_name: form.full_name || undefined,
        bio: form.bio || undefined,
        followers_count: form.followers_count ? Number(form.followers_count) : undefined,
        following_count: form.following_count ? Number(form.following_count) : undefined,
        posts_count: form.posts_count ? Number(form.posts_count) : undefined,
        niche: form.niche || undefined,
        website: form.website || undefined,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
      };

      const ai = await analyzeInstagramProspect(input);

      await createProspect.mutateAsync({
        ...input,
        ai_analysis: ai.analysis,
        ai_dm_message: ai.dm_message,
        ai_proposal_brief: ai.proposal_brief,
        ai_creative_concept: ai.creative_concept,
        status: 'Identificado',
        meeting_date: null,
        loss_reason: null,
        notes: null,
        pipeline_lead_id: null,
        engagement_rate: null,
      });

      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao analisar perfil. Verifique os dados e tente novamente.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>@Username do Instagram *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              className="pl-7"
              placeholder="nomedo perfil"
              value={form.username}
              onChange={e => set('username', e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Nome / Empresa</Label>
          <Input placeholder="Ex: João Silva" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
        </div>
        <div>
          <Label>Nicho / Segmento</Label>
          <Input placeholder="Ex: Restaurante, Clínica..." value={form.niche} onChange={e => set('niche', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Bio do perfil</Label>
          <Textarea
            placeholder="Cole aqui a bio do Instagram..."
            rows={2}
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
          />
        </div>
        <div>
          <Label>Seguidores</Label>
          <Input type="number" placeholder="Ex: 5000" value={form.followers_count} onChange={e => set('followers_count', e.target.value)} />
        </div>
        <div>
          <Label>Posts</Label>
          <Input type="number" placeholder="Ex: 120" value={form.posts_count} onChange={e => set('posts_count', e.target.value)} />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input placeholder="(11) 99999-9999" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" placeholder="contato@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Site</Label>
          <Input placeholder="https://..." value={form.website} onChange={e => set('website', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button className="flex-1 gap-2" onClick={handleAnalyzeAndSave} disabled={analyzing}>
          {analyzing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analisando com IA...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Analisar e Salvar</>
          )}
        </Button>
      </div>
    </div>
  );
}

interface ProspectCardProps {
  prospect: InstagramProspect;
}

function ProspectCard({ prospect }: ProspectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'dm' | 'whatsapp' | 'analysis' | 'proposal' | 'creative'>('dm');
  const updateProspect = useUpdateProspect();
  const deleteProspect = useDeleteProspect();

  const handleStatusChange = (status: ProspectStatus) => {
    updateProspect.mutate({ id: prospect.id, status });
  };

  const statusColor = STATUS_COLORS[prospect.status];

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
              <Instagram className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">@{prospect.username}</p>
              {prospect.full_name && (
                <p className="text-xs text-muted-foreground truncate">{prospect.full_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Select value={prospect.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-6 text-xs px-2 w-auto border-none shadow-none">
                <SelectValue>
                  <Badge className={`${statusColor} text-white text-xs px-1.5 py-0`}>
                    {STATUS_LABELS[prospect.status]}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROSPECT_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} />
                      {s}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumo rápido */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {prospect.niche && <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{prospect.niche}</span>}
          {prospect.followers_count && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{prospect.followers_count.toLocaleString('pt-BR')}</span>}
          {prospect.whatsapp && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />WhatsApp</span>}
          {prospect.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />Email</span>}
        </div>
      </CardHeader>

      {/* Botões de ação rápida */}
      <CardContent className="px-4 pb-3 space-y-2">
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs gap-1"
            onClick={() => {
              copyToClipboard(prospect.ai_dm_message || '', 'Mensagem DM');
              openInstagramConversation(prospect.username);
            }}
          >
            <Instagram className="w-3 h-3" /> DM + Abrir
          </Button>
          {prospect.whatsapp && prospect.ai_dm_message && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => sendWhatsApp(prospect.whatsapp!, prospect.ai_dm_message!)}
            >
              <MessageCircle className="w-3 h-3" /> WhatsApp
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => window.open(`https://instagram.com/${prospect.username}`, '_blank')}
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => deleteProspect.mutate(prospect.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {/* Expandir conteúdo IA */}
        {(prospect.ai_dm_message || prospect.ai_analysis) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 text-xs text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <><ChevronUp className="w-3 h-3 mr-1" />Ocultar IA</> : <><ChevronDown className="w-3 h-3 mr-1" />Ver análise IA</>}
          </Button>
        )}

        {expanded && (
          <div className="space-y-2 pt-1">
            {/* Tabs */}
            <div className="flex gap-1 flex-wrap">
              {[
                { key: 'dm', label: 'DM', icon: <Instagram className="w-3 h-3" /> },
                { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-3 h-3" /> },
                { key: 'analysis', label: 'Análise', icon: <Search className="w-3 h-3" /> },
                { key: 'proposal', label: 'Proposta', icon: <FileText className="w-3 h-3" /> },
                { key: 'creative', label: 'Criativo', icon: <Lightbulb className="w-3 h-3" /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo da tab */}
            {activeTab === 'dm' && prospect.ai_dm_message && (
              <div className="relative">
                <p className="text-xs bg-secondary/50 rounded p-2 pr-8 whitespace-pre-wrap">{prospect.ai_dm_message}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => copyToClipboard(prospect.ai_dm_message!, 'Mensagem DM')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}
            {activeTab === 'whatsapp' && (
              <div className="relative">
                <p className="text-xs bg-secondary/50 rounded p-2 pr-8 whitespace-pre-wrap">
                  {prospect.ai_dm_message || 'Sem mensagem gerada'}
                </p>
                {prospect.ai_dm_message && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => copyToClipboard(prospect.ai_dm_message!, 'Mensagem WhatsApp')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
                {prospect.whatsapp && prospect.ai_dm_message && (
                  <Button
                    size="sm"
                    className="w-full mt-1 h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                    onClick={() => sendWhatsApp(prospect.whatsapp!, prospect.ai_dm_message!)}
                  >
                    <MessageCircle className="w-3 h-3" /> Enviar no WhatsApp agora
                  </Button>
                )}
              </div>
            )}
            {activeTab === 'analysis' && prospect.ai_analysis && (
              <p className="text-xs bg-secondary/50 rounded p-2 whitespace-pre-wrap">{prospect.ai_analysis}</p>
            )}
            {activeTab === 'proposal' && prospect.ai_proposal_brief && (
              <div className="relative">
                <p className="text-xs bg-secondary/50 rounded p-2 pr-8 whitespace-pre-wrap">{prospect.ai_proposal_brief}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => copyToClipboard(prospect.ai_proposal_brief!, 'Brief de proposta')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}
            {activeTab === 'creative' && prospect.ai_creative_concept && (
              <div className="relative">
                <p className="text-xs bg-secondary/50 rounded p-2 pr-8 whitespace-pre-wrap">{prospect.ai_creative_concept}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => copyToClipboard(prospect.ai_creative_concept!, 'Conceito criativo')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InstagramProspecting() {
  const { data: prospects, isLoading } = useInstagramProspects();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ProspectStatus | 'Todos'>('Todos');
  const [search, setSearch] = useState('');

  const filtered = (prospects || []).filter(p => {
    const matchStatus = filterStatus === 'Todos' || p.status === filterStatus;
    const matchSearch = !search || p.username.toLowerCase().includes(search.toLowerCase()) || (p.full_name || '').toLowerCase().includes(search.toLowerCase()) || (p.niche || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = (prospects || []).reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
              <Instagram className="w-3.5 h-3.5 text-white" />
            </div>
            Prospecção Instagram
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Analise perfis com IA e gere mensagens personalizadas para marcar reuniões
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4" /> Novo Prospect
        </Button>
      </div>

      {/* Funil resumido */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['Todos', ...PROSPECT_STATUSES] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterStatus === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {s !== 'Todos' && <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s as ProspectStatus]}`} />}
            {s}
            {s !== 'Todos' && counts[s] ? (
              <span className="bg-white/20 rounded-full px-1">{counts[s]}</span>
            ) : null}
            {s === 'Todos' && prospects?.length ? (
              <span className="bg-white/20 rounded-full px-1">{prospects.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9 h-8 text-sm"
          placeholder="Buscar por @username, nome ou nicho..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-400/20 flex items-center justify-center mx-auto mb-3">
            <Instagram className="w-6 h-6 text-pink-500" />
          </div>
          <p className="font-medium text-sm">Nenhum prospect encontrado</p>
          <p className="text-xs mt-1">Clique em "Novo Prospect" para começar a prospectar via Instagram</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <ProspectCard key={p.id} prospect={p} />
          ))}
        </div>
      )}

      {/* Dialog adicionar */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                <Instagram className="w-3.5 h-3.5 text-white" />
              </div>
              Novo Prospect Instagram
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Preencha os dados do perfil. A IA vai analisar e gerar mensagem personalizada + brief de proposta automaticamente.
          </p>
          <AddProspectForm onClose={() => setShowAddDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
