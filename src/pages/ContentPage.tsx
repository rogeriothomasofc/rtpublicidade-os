import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Trash2, Pencil, ArrowRight, ExternalLink, Lightbulb, Clapperboard, CheckCircle2, Send, ChevronLeft, ChevronRight, Images, CalendarDays, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useContentItems,
  useCreateContentItem,
  useUpdateContentItem,
  useDeleteContentItem,
  useMoveContentItem,
  useMarkContentUsed,
  usePublishToInstagram,
  type ContentItem,
  type ContentCategory,
  type ContentPlatform,
} from '@/hooks/useContentItems';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, addMonths, subMonths, isToday, parseISO,
} from 'date-fns';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PLATFORMS: ContentPlatform[] = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'Twitter', 'Outro'];

const PT_WEEKDAYS: Record<string, number> = {
  'domingo': 0, 'segunda': 1, 'segunda-feira': 1,
  'terça': 2, 'terça-feira': 2, 'terca': 2, 'terca-feira': 2,
  'quarta': 3, 'quarta-feira': 3,
  'quinta': 4, 'quinta-feira': 4,
  'sexta': 5, 'sexta-feira': 5,
  'sábado': 6, 'sabado': 6,
};

function nextWeekdayDate(dayName: string): string | null {
  const target = PT_WEEKDAYS[dayName.toLowerCase().trim()];
  if (target === undefined) return null;
  const today = new Date();
  const diff = (target - today.getDay() + 7) % 7 || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next.toISOString().split('T')[0];
}
const STATUSES = ['Briefing', 'Em Produção', 'Revisão', 'Aprovado', 'Postado'] as const;

const statusColors: Record<string, string> = {
  Briefing: 'bg-muted text-muted-foreground',
  'Em Produção': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  Revisão: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  Aprovado: 'bg-green-500/15 text-green-700 dark:text-green-400',
  Postado: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

const platformColors: Record<string, string> = {
  Instagram: 'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  Facebook: 'bg-blue-600/15 text-blue-700 dark:text-blue-400',
  TikTok: 'bg-slate-800/15 text-slate-700 dark:text-slate-300',
  YouTube: 'bg-red-500/15 text-red-700 dark:text-red-400',
  LinkedIn: 'bg-sky-600/15 text-sky-700 dark:text-sky-400',
  Twitter: 'bg-sky-400/15 text-sky-600 dark:text-sky-400',
  Outro: 'bg-muted text-muted-foreground',
};

// ─── Publish Dialog ───────────────────────────────────────────────────────────

interface PublishDialogProps {
  item: ContentItem | null;
  onClose: () => void;
}

function PublishDialog({ item, onClose }: PublishDialogProps) {
  const [caption, setCaption] = useState(() => item?.description ?? '');
  const [slideIdx, setSlideIdx] = useState(0);
  const publish = usePublishToInstagram();

  if (!item) return null;

  const images = item.image_urls ?? [];
  const hasImages = images.length > 0;

  const handlePublish = async () => {
    await publish.mutateAsync({ item, caption });
    onClose();
  };

  return (
    <Dialog open={!!item} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-pink-500" />
            Publicar no Instagram
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <p className="font-medium">{item.title}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className={`text-xs ${platformColors[item.platform] ?? ''}`}>{item.platform}</Badge>
              {item.client && <span className="text-xs text-muted-foreground">{item.client.name}</span>}
            </div>
          </div>

          {/* Preview dos slides */}
          {hasImages ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Images className="w-4 h-4" /> {images.length} slide{images.length > 1 ? 's' : ''}
              </p>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-square max-w-xs mx-auto">
                <img
                  src={images[slideIdx]}
                  alt={`Slide ${slideIdx + 1}`}
                  className="w-full h-full object-contain"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSlideIdx(i => Math.max(0, i - 1))}
                      disabled={slideIdx === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSlideIdx(i => Math.min(images.length - 1, i + 1))}
                      disabled={slideIdx === images.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSlideIdx(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${i === slideIdx ? 'bg-white' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm">
              Nenhuma imagem disponível neste conteúdo.
              <br />Você precisa ter imagens para publicar no Instagram.
            </div>
          )}

          {/* Caption */}
          <div className="space-y-1.5">
            <Label>Caption do Instagram</Label>
            <Textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Escreva a legenda do post..."
              rows={6}
              className="text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{caption.length}/2200 caracteres</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handlePublish}
            disabled={!hasImages || publish.isPending || caption.length > 2200}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0"
          >
            {publish.isPending ? 'Publicando...' : (
              <><Send className="w-4 h-4 mr-2" /> Publicar no Instagram</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  category: ContentCategory;
  platform: string;
  client_id: string;
  status: string;
  scheduled_date: string;
  posted_date: string;
  post_link: string;
}

const emptyForm = (category: ContentCategory): FormState => ({
  title: '', description: '', category, platform: 'Instagram', client_id: '',
  status: category === 'Postado' ? 'Postado' : 'Briefing',
  scheduled_date: '', posted_date: '', post_link: '',
});

interface ItemDialogProps {
  open: boolean;
  onClose: () => void;
  defaultCategory: ContentCategory;
  editing?: ContentItem | null;
}

function ItemDialog({ open, onClose, defaultCategory, editing }: ItemDialogProps) {
  const { data: clients = [] } = useClients();
  const create = useCreateContentItem();
  const update = useUpdateContentItem();

  const [form, setForm] = useState<FormState>(() =>
    editing ? {
      title: editing.title, description: editing.description ?? '',
      category: editing.category, platform: editing.platform,
      client_id: editing.client_id ?? '', status: editing.status,
      scheduled_date: editing.scheduled_date ?? '',
      posted_date: editing.posted_date ?? '', post_link: editing.post_link ?? '',
    } : emptyForm(defaultCategory)
  );

  const handleOpen = (v: boolean) => {
    if (v) setForm(editing ? {
      title: editing.title, description: editing.description ?? '',
      category: editing.category, platform: editing.platform,
      client_id: editing.client_id ?? '', status: editing.status,
      scheduled_date: editing.scheduled_date ?? '',
      posted_date: editing.posted_date ?? '', post_link: editing.post_link ?? '',
    } : emptyForm(defaultCategory));
    else onClose();
  };

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(), description: form.description || null,
      category: form.category, platform: form.platform,
      client_id: form.client_id || null, status: form.status as any,
      scheduled_date: form.scheduled_date || null,
      posted_date: form.posted_date || null, post_link: form.post_link || null,
    };
    if (editing) await update.mutateAsync({ id: editing.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  };

  const isBusy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar conteúdo' : 'Novo conteúdo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Reels de bastidores" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detalhes, referências, briefing..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ideia">Ideia</SelectItem>
                  <SelectItem value="A Criar">A Criar</SelectItem>
                  <SelectItem value="Postado">Postado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={v => set('platform', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={form.client_id || 'none'} onValueChange={v => set('client_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {form.category === 'A Criar' && (
            <div className="space-y-1.5">
              <Label>Data prevista</Label>
              <Input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
            </div>
          )}
          {form.category === 'Postado' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data de postagem</Label>
                <Input type="date" value={form.posted_date} onChange={e => set('posted_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Link do post</Label>
                <Input value={form.post_link} onChange={e => set('post_link', e.target.value)} placeholder="https://..." />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isBusy || !form.title.trim()}>
            {isBusy ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Content Detail Modal ─────────────────────────────────────────────────────

function ContentDetailModal({ item, onClose, onEdit }: { item: ContentItem | null; onClose: () => void; onEdit: (item: ContentItem) => void }) {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const handleCopy = () => {
    const text = item.description
      ? `${item.title}\n\n${item.description}`
      : item.title;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!item} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">{item.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className={`text-xs ${platformColors[item.platform] ?? 'bg-muted text-muted-foreground'}`}>
              {item.platform}
            </Badge>
            <Badge variant="secondary" className={`text-xs ${statusColors[item.status] ?? ''}`}>
              {item.status}
            </Badge>
            {item.client && (
              <Badge variant="outline" className="text-xs">{item.client.name}</Badge>
            )}
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          )}

          {item.category === 'Postado' && (item.posted_date || item.post_link) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {item.posted_date && (
                <span>Postado em {format(new Date(item.posted_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}</span>
              )}
              {item.post_link && (
                <a href={item.post_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" /> Ver post
                </a>
              )}
            </div>
          )}

          {item.image_urls?.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {item.image_urls.map((url, i) => (
                <div key={i} className="aspect-square rounded-md overflow-hidden bg-black">
                  <img src={url} alt={`Imagem ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap sm:flex-nowrap">
          <Button variant="outline" onClick={handleCopy} className="flex-1 sm:flex-none">
            {copied ? (
              <><Check className="w-4 h-4 mr-2 text-success" /> Copiado!</>
            ) : (
              <><Copy className="w-4 h-4 mr-2" /> Copiar tema</>
            )}
          </Button>
          <Button variant="outline" onClick={() => { onClose(); onEdit(item); }} className="flex-1 sm:flex-none">
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Content Card ─────────────────────────────────────────────────────────────

interface CardProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  onPublish: (item: ContentItem) => void;
  onOpen: (item: ContentItem) => void;
}

function ContentCard({ item, onEdit, onPublish, onOpen }: CardProps) {
  const del = useDeleteContentItem();
  const move = useMoveContentItem();
  const update = useUpdateContentItem();
  const markUsed = useMarkContentUsed();

  const hasImages = item.image_urls?.length > 0;
  const canPublish = item.status === 'Aprovado' && item.platform === 'Instagram' && hasImages;
  const canMoveToPostado = item.category === 'A Criar';

  return (
    <div
      className={`border rounded-lg overflow-hidden bg-card transition-shadow cursor-pointer relative ${
        item.is_used ? 'opacity-50 grayscale' : 'hover:shadow-md'
      }`}
      onClick={() => onOpen(item)}
    >
      {item.is_used && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <span className="bg-background/80 text-xs font-semibold text-muted-foreground px-3 py-1 rounded-full border border-border">
            Já usado
          </span>
        </div>
      )}
      {/* Preview da primeira imagem */}
      {hasImages && (
        <div className="aspect-square bg-black relative overflow-hidden">
          <img src={item.image_urls[0]} alt="preview" className="w-full h-full object-cover" />
          {item.image_urls.length > 1 && (
            <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full">
              1/{item.image_urls.length}
            </span>
          )}
        </div>
      )}

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-snug line-clamp-2">{item.title}</p>
          <div onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mt-0.5">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                {canMoveToPostado && (
                  <DropdownMenuItem onClick={() => move.mutate({ id: item.id, category: 'Postado' })}>
                    <ArrowRight className="w-4 h-4 mr-2" /> Marcar como Postado
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => markUsed.mutate({ id: item.id, is_used: !item.is_used })}>
                  <Check className="w-4 h-4 mr-2" />
                  {item.is_used ? 'Desmarcar como usado' : 'Marcar como usado'}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => del.mutate(item.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {item.description && !hasImages && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 items-center">
          <Badge variant="secondary" className={`text-xs ${platformColors[item.platform] ?? 'bg-muted text-muted-foreground'}`}>
            {item.platform}
          </Badge>
          {item.client && <span className="text-xs text-muted-foreground truncate">{item.client.name}</span>}
        </div>

        {(item.scheduled_date || item.best_time) && item.category === 'Ideia' && (
          <p className="text-xs text-muted-foreground">
            {[item.scheduled_date ? format(new Date(item.scheduled_date + 'T00:00:00'), 'dd/MM', { locale: ptBR }) : null, item.best_time].filter(Boolean).join(' · ')}
          </p>
        )}

        {item.category === 'A Criar' && (
          <div className="flex items-center justify-between gap-2">
            <Select value={item.status} onValueChange={v => {
              const updates: Record<string, unknown> = { status: v };
              if (v === 'Postado') {
                updates.category = 'Postado';
                updates.posted_date = new Date().toISOString().split('T')[0];
              }
              update.mutate({ id: item.id, ...updates } as any);
            }}>
              <SelectTrigger className="h-7 border-none shadow-none px-0 text-xs hover:bg-muted/50 w-auto flex-1">
                <Badge variant="secondary" className={`text-xs ${statusColors[item.status]}`}>{item.status}</Badge>
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>
                    <Badge variant="secondary" className={`text-xs ${statusColors[s]}`}>{s}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botão publicar — só aparece quando Aprovado + Instagram + tem imagens */}
            {canPublish && (
              <Button
                size="sm"
                onClick={() => onPublish(item)}
                className="h-7 text-xs shrink-0 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0"
              >
                <Send className="w-3 h-3 mr-1" /> Publicar
              </Button>
            )}
          </div>
        )}

        {item.category === 'A Criar' && item.scheduled_date && (
          <p className="text-xs text-muted-foreground">
            Previsto: {format(new Date(item.scheduled_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}

        {item.category === 'Postado' && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {item.posted_date && (
              <span>{format(new Date(item.posted_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}</span>
            )}
            {item.post_link && (
              <a href={item.post_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline" onClick={e => e.stopPropagation()}>
                <ExternalLink className="w-3 h-3" /> Ver post
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Ideas Dialog ──────────────────────────────────────────────────────────

const CONTENT_FORMATS = [
  'Reels',
  'Carrossel',
  'Post Estático',
  'Stories',
  'Live',
  'Tutorial',
  'Bastidores',
  'Depoimento',
];

interface GeneratedIdea {
  title: string;
  description: string;
  platform: string;
  format: string;
  best_day?: string;
  best_time?: string;
}

function AIIdeasDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [platform, setPlatform] = useState('Instagram');
  const [contentFormat, setContentFormat] = useState('Reels');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const create = useCreateContentItem();

  const handleGenerate = async () => {
    setLoading(true);
    setIdeas([]);
    setSelected(new Set());
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('generate-content-ideas', {
        body: { platform, format: contentFormat, context },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      setIdeas(res.data?.ideas ?? []);
      setSelected(new Set((res.data?.ideas ?? []).map((_: any, i: number) => i)));
    } catch (e) {
      toast.error('Erro ao gerar ideias. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const toggleIdea = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleSave = async () => {
    const toSave = ideas.filter((_, i) => selected.has(i));
    if (toSave.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(toSave.map(idea =>
        create.mutateAsync({
          title: idea.title,
          description: idea.description,
          category: 'Ideia',
          platform: idea.platform as any,
          client_id: null,
          status: 'Briefing',
          scheduled_date: idea.best_day ? nextWeekdayDate(idea.best_day) : null,
          posted_date: null,
          post_link: null,
          best_day: idea.best_day ?? null,
          best_time: idea.best_time ?? null,
        })
      ));
      toast.success(`${toSave.length} ideia(s) salva(s) com sucesso!`);
      onClose();
    } catch {
      toast.error('Erro ao salvar ideias.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setIdeas([]);
    setContext('');
    setSelected(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar ideias de conteúdo com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.filter(p => p !== 'Outro').map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <Select value={contentFormat} onValueChange={setContentFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_FORMATS.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contexto <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Ex: e-commerce..."
              />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando ideias...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Gerar ideias</>
            )}
          </Button>

          {ideas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{ideas.length} ideias geradas</p>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelected(selected.size === ideas.length ? new Set() : new Set(ideas.map((_, i) => i)))}
                >
                  {selected.size === ideas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {ideas.map((idea, i) => (
                  <div
                    key={i}
                    onClick={() => toggleIdea(i)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.has(i) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center ${
                        selected.has(i) ? 'bg-primary border-primary' : 'border-muted-foreground'
                      }`}>
                        {selected.has(i) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{idea.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{idea.description}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
                          {idea.format && (
                            <Badge variant="outline" className="text-xs">{idea.format}</Badge>
                          )}
                          <Badge variant="secondary" className={`text-xs ${platformColors[idea.platform] ?? 'bg-muted text-muted-foreground'}`}>
                            {idea.platform}
                          </Badge>
                          {(idea.best_day || idea.best_time) && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              {[idea.best_day, idea.best_time].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {ideas.length > 0 && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || selected.size === 0}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : `Salvar ${selected.size} ideia(s)`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab Panel ────────────────────────────────────────────────────────────────

interface TabPanelProps {
  category: ContentCategory;
  onAdd: () => void;
  onEdit: (item: ContentItem) => void;
  onPublish: (item: ContentItem) => void;
  onOpen: (item: ContentItem) => void;
}

function TabPanel({ category, onAdd, onEdit, onPublish, onOpen }: TabPanelProps) {
  const { data: items = [], isLoading } = useContentItems(category);

  const filtered = items;

  if (isLoading) return <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>;

  // Destacar itens "Aprovado" no topo da aba "A Criar"
  const sorted = category === 'A Criar'
    ? [...filtered].sort((a, b) => (a.status === 'Aprovado' ? -1 : b.status === 'Aprovado' ? 1 : 0))
    : filtered;

  return (
    <div>
      {/* Banner de itens prontos para publicar */}
      {category === 'A Criar' && filtered.some(i => i.status === 'Aprovado' && i.image_urls?.length > 0) && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {filtered.filter(i => i.status === 'Aprovado' && i.image_urls?.length > 0).length} conteúdo(s) aprovado(s) pronto(s) para publicar no Instagram
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          {category === 'Ideia' && <Lightbulb className="w-10 h-10 opacity-30" />}
          {category === 'A Criar' && <Clapperboard className="w-10 h-10 opacity-30" />}
          {category === 'Postado' && <CheckCircle2 className="w-10 h-10 opacity-30" />}
          <p className="text-sm">Nenhum conteúdo aqui ainda</p>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sorted.map(item => (
            <ContentCard key={item.id} item={item} onEdit={onEdit} onPublish={onPublish} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

const DAYS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function CalendarView({ onEdit, onPublish }: { onEdit: (i: ContentItem) => void; onPublish: (i: ContentItem) => void }) {
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const { data: ideias = [] } = useContentItems('Ideia');
  const { data: aCriar = [] } = useContentItems('A Criar');
  const { data: postados = [] } = useContentItems('Postado');
  const allItems = [...ideias, ...aCriar, ...postados];

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Padding para alinhar domingo=0
  const startPad = monthStart.getDay();

  function itemsForDay(day: Date) {
    return allItems.filter(i => {
      const dateStr = i.category === 'Postado' ? i.posted_date : i.scheduled_date;
      if (!dateStr) return false;
      return isSameDay(parseISO(dateStr), day);
    });
  }

  const categoryDot: Record<string, string> = {
    Ideia: 'bg-purple-500',
    'A Criar': 'bg-blue-500',
    Postado: 'bg-emerald-500',
  };

  const selectedItems = selected ? itemsForDay(selected) : [];

  return (
    <div className="space-y-4">
      {/* Header do mês */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrent(d => subMonths(d, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-semibold text-base capitalize">
          {format(current, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrent(d => addMonths(d, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {DAYS_LABEL.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Células */}
        <div className="grid grid-cols-7">
          {/* Padding inicial */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] border-b border-r bg-muted/10" />
          ))}

          {days.map(day => {
            const items = itemsForDay(day);
            const isSelected = selected && isSameDay(day, selected);
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelected(isSameDay(day, selected ?? new Date(0)) ? null : day)}
                className={`min-h-[80px] border-b border-r p-1.5 cursor-pointer transition-colors
                  ${isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary' : 'hover:bg-muted/40'}
                  ${!isSameMonth(day, current) ? 'opacity-40' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${today ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {items.slice(0, 3).map(item => (
                    <div
                      key={item.id}
                      className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate
                        ${item.category === 'Postado'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : item.category === 'Ideia'
                          ? 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
                          : 'bg-blue-500/20 text-blue-700 dark:text-blue-400'}`}
                    >
                      {item.title}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{items.length - 3} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/40 inline-block" /> Ideia (sugerido pela IA)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 inline-block" /> Postado
        </span>
      </div>

      {/* Painel do dia selecionado */}
      {selected && (
        <div className="border rounded-lg p-4 space-y-3">
          <p className="font-medium text-sm">
            {format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          {selectedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum conteúdo neste dia.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedItems.map(item => (
                <ContentCard key={item.id} item={item} onEdit={onEdit} onPublish={onPublish} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<ContentCategory | 'calendar'>(
    (searchParams.get('tab') as ContentCategory | 'calendar') ||
    (localStorage.getItem('tab:content') as ContentCategory | 'calendar') ||
    'Ideia'
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiDialogOpen, setAIDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [publishing, setPublishing] = useState<ContentItem | null>(null);
  const [viewing, setViewing] = useState<ContentItem | null>(null);

  const openEdit = (item: ContentItem) => { setEditing(item); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  return (
    <MainLayout>
      <div className="space-y-5">
        <Tabs value={tab} onValueChange={v => { const t = v as ContentCategory | 'calendar'; setTab(t); setSearchParams({ tab: t }, { replace: true }); localStorage.setItem('tab:content', t); }}>
          <div className="flex items-center justify-between gap-3">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="Ideia" className="flex items-center gap-1.5 flex-1 sm:flex-none">
                <Lightbulb className="w-4 h-4" /> Ideias
              </TabsTrigger>
              <TabsTrigger value="Postado" className="flex items-center gap-1.5 flex-1 sm:flex-none">
                <CheckCircle2 className="w-4 h-4" /> Postados
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-1.5 flex-1 sm:flex-none">
                <CalendarDays className="w-4 h-4" /> Calendário
              </TabsTrigger>
            </TabsList>
            {tab === 'Ideia' && (
              <Button onClick={() => setAIDialogOpen(true)} className="shrink-0">
                <Sparkles className="w-4 h-4 mr-2" /> Gerar ideias com IA
              </Button>
            )}
          </div>

          <TabsContent value="Ideia" className="mt-4">
            <TabPanel category="Ideia" onAdd={() => setAIDialogOpen(true)} onEdit={openEdit} onPublish={setPublishing} onOpen={setViewing} />
          </TabsContent>
          <TabsContent value="Postado" className="mt-4">
            <TabPanel category="Postado" onAdd={() => {}} onEdit={openEdit} onPublish={setPublishing} onOpen={setViewing} />
          </TabsContent>
          <TabsContent value="calendar" className="mt-4">
            <CalendarView onEdit={openEdit} onPublish={setPublishing} />
          </TabsContent>
        </Tabs>
      </div>

      <AIIdeasDialog open={aiDialogOpen} onClose={() => setAIDialogOpen(false)} />
      <ContentDetailModal item={viewing} onClose={() => setViewing(null)} onEdit={openEdit} />
      <ItemDialog open={dialogOpen} onClose={closeDialog} defaultCategory={tab === 'calendar' ? 'Ideia' : tab as ContentCategory} editing={editing} />
      <PublishDialog item={publishing} onClose={() => setPublishing(null)} />
    </MainLayout>
  );
}
