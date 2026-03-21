import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, RotateCcw, ArrowUpRight, PanelRightClose, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/hooks/useClients';
import { useTasks } from '@/hooks/useTasks';
import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { useFinance } from '@/hooks/useFinance';
import { useContracts } from '@/hooks/useContracts';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const HISTORY_KEY = 'ai-chat-history';

function loadHistory(): Conversation[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored).map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
    }));
  } catch {
    return [];
  }
}

function saveToHistory(msgs: Message[]) {
  if (msgs.length === 0) return;
  const history = loadHistory();
  const firstUserMsg = msgs.find(m => m.role === 'user');
  const conv: Conversation = {
    id: Date.now().toString(),
    title: firstUserMsg?.content.slice(0, 60) || 'Conversa',
    messages: msgs,
    createdAt: new Date(),
  };
  localStorage.setItem(HISTORY_KEY, JSON.stringify([conv, ...history].slice(0, 20)));
}

const SUGGESTED_PROMPTS = [
  'Quais clientes têm fatura vencida?',
  'Quais tarefas estão atrasadas?',
  'Qual é o valor total do pipeline?',
  'Quais contratos vencem em breve?',
];

interface AIChatProps {
  open: boolean;
  onClose: () => void;
}

export function AIChat({ open, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'chat' | 'history'>('chat');
  const [history, setHistory] = useState<Conversation[]>([]);
  const [viewingConv, setViewingConv] = useState<Conversation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { user } = useAuth();
  const { dateRange } = useDashboardFilters();
  const { data: clients } = useClients();
  const { data: tasks } = useTasks();
  const { data: leads } = useSalesPipeline();
  const { data: finance } = useFinance();
  const { data: contracts } = useContracts();
  const { data: stats } = useDashboardStats(dateRange);

  const { data: profile } = useQuery({
    queryKey: ['profile-aichat', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('name').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const firstName = profile?.name?.split(' ')[0]
    || (user?.user_metadata?.full_name as string)?.split(' ')[0]
    || user?.email?.split('@')[0]
    || '';

  // Save to history when panel closes with messages
  useEffect(() => {
    if (!open && messages.length > 0) {
      saveToHistory(messages);
      setMessages([]);
    }
  }, [open]);

  // Load history when switching to history tab
  useEffect(() => {
    if (tab === 'history') {
      setHistory(loadHistory());
      setViewingConv(null);
    }
  }, [tab]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const buildContext = () => {
    const now = new Date();

    const activeClients = (clients || []).filter(c => c.status === 'Ativo');
    const overdueTasks = (tasks || []).filter(t =>
      t.status !== 'Concluído' && t.due_date && new Date(t.due_date) < now
    );
    const pendingTasks = (tasks || []).filter(t => t.status === 'A Fazer');
    const inProgressTasks = (tasks || []).filter(t => t.status === 'Fazendo');

    const overdueFinance = (finance || []).filter(f => f.status === 'Atrasado');
    const pendingFinance = (finance || []).filter(f => f.status === 'Pendente');
    const overdueAmount = overdueFinance.reduce((s, f) => s + Number(f.amount), 0);
    const pendingAmount = pendingFinance.reduce((s, f) => s + Number(f.amount), 0);

    const activeLeads = (leads || []).filter(l => !['Ganho', 'Perdido'].includes(l.stage));
    const proposalLeads = (leads || []).filter(l => l.stage === 'Proposta');
    const pipelineValue = activeLeads.reduce((s, l) => s + Number(l.deal_value), 0);

    const expiringContracts = (contracts || []).filter((c: any) => {
      if (!c.end_date || c.status !== 'Ativo') return false;
      const daysLeft = Math.ceil((new Date(c.end_date).getTime() - now.getTime()) / 86400000);
      return daysLeft > 0 && daysLeft <= 30;
    });

    return `Você é o assistente interno da RT Publicidade, uma agência de marketing digital e tráfego pago. Você tem acesso completo aos dados da agência em tempo real e deve responder de forma direta, objetiva e em português brasileiro.

DADOS ATUAIS DA AGÊNCIA (${now.toLocaleDateString('pt-BR')}):

CLIENTES:
- Total cadastrado: ${(clients || []).length}
- Ativos: ${activeClients.length}
- Pausados: ${(clients || []).filter(c => c.status === 'Pausado').length}
- Leads (não convertidos): ${(clients || []).filter(c => c.status === 'Lead').length}
- Fee mensal total (MRR): R$ ${activeClients.reduce((s, c) => s + Number(c.fee || 0), 0).toLocaleString('pt-BR')}
${activeClients.length > 0 ? `- Lista de ativos: ${activeClients.slice(0, 10).map(c => `${c.name} (${c.company}, R$${Number(c.fee).toLocaleString('pt-BR')}/mês)`).join('; ')}` : ''}

TAREFAS:
- Total: ${(tasks || []).length}
- Atrasadas: ${overdueTasks.length}${overdueTasks.length > 0 ? ` — ${overdueTasks.slice(0, 5).map(t => `"${t.title}"${t.client ? ` (${t.client.name})` : ''}`).join(', ')}` : ''}
- Em andamento: ${inProgressTasks.length}
- A fazer: ${pendingTasks.length}
- Concluídas: ${(tasks || []).filter(t => t.status === 'Concluído').length}

FINANCEIRO:
- Faturas vencidas (valor total): R$ ${overdueAmount.toLocaleString('pt-BR')} (${overdueFinance.length} fatura(s))
${overdueFinance.length > 0 ? `  Detalhes: ${overdueFinance.slice(0, 5).map(f => `R$${Number(f.amount).toLocaleString('pt-BR')} – ${f.description || f.type}`).join('; ')}` : ''}
- Pendentes: R$ ${pendingAmount.toLocaleString('pt-BR')} (${pendingFinance.length} fatura(s))
- Receita do período: R$ ${(stats?.revenueInPeriod || 0).toLocaleString('pt-BR')}

PIPELINE DE VENDAS:
- Leads ativos: ${activeLeads.length}
- Em proposta: ${proposalLeads.length}
- Valor total do pipeline: R$ ${pipelineValue.toLocaleString('pt-BR')}
- Leads ganhos (período): ${stats?.leadsWon || 0}
${activeLeads.length > 0 ? `- Principais leads: ${activeLeads.slice(0, 5).map(l => `${l.lead_name} (${l.stage}, R$${Number(l.deal_value).toLocaleString('pt-BR')})`).join('; ')}` : ''}

CONTRATOS:
- Contratos ativos: ${(contracts || []).filter((c: any) => c.status === 'Ativo').length}
- Vencendo em 30 dias: ${expiringContracts.length}${expiringContracts.length > 0 ? ` — ${(expiringContracts as any[]).slice(0, 3).map((c: any) => `${c.client?.name || 'cliente'} (vence ${new Date(c.end_date).toLocaleDateString('pt-BR')})`).join(', ')}` : ''}

Responda de forma clara e direta. Quando listar itens, use listas com marcadores. Seja um consultor estratégico que conhece os números e ajuda a tomar decisões. Não invente dados que não estão aqui — se não tiver a informação, diga que não está disponível no momento.`;
  };

  const sendMessage = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const systemPrompt = buildContext();
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: history,
          context: systemPrompt,
        },
      });

      if (error) throw error;
      const content = data?.text || 'Não consegui gerar uma resposta. Tente novamente.';

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Erro ao conectar com a IA. Verifique sua conexão e tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (messages.length > 0) saveToHistory(messages);
    setMessages([]);
  };

  if (!open) return null;

  const isWelcome = messages.length === 0;

  return (
    <div className="fixed right-0 top-0 h-screen w-[400px] max-w-[100vw] z-50 flex flex-col bg-background border-l border-border shadow-2xl animate-in slide-in-from-right duration-200">

      {/* Header — tabs + close */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
          <button
            onClick={() => setTab('chat')}
            className={cn(
              'px-3.5 py-1.5 text-sm rounded-md font-medium transition-colors',
              tab === 'chat'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setTab('history')}
            className={cn(
              'px-3.5 py-1.5 text-sm rounded-md font-medium transition-colors',
              tab === 'history'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Histórico
          </button>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && tab === 'chat' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={clearChat}
              title="Limpar conversa"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <PanelRightClose className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* History tab */}
      {tab === 'history' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {viewingConv ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
                <button onClick={() => setViewingConv(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
                <span className="text-xs text-muted-foreground truncate flex-1">{viewingConv.title}</span>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {viewingConv.messages.map(msg => (
                    <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted/50 border border-border/50 rounded-tl-sm'
                      )}>
                        <MessageContent content={msg.content} />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Sem histórico</p>
              <p className="text-xs text-muted-foreground mt-1">As conversas são salvas ao fechar o chat.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
                <span className="text-xs text-muted-foreground">{history.length} conversa(s)</span>
                <button
                  className="text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1"
                  onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]); }}
                >
                  <Trash2 className="w-3 h-3" /> Limpar
                </button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-1.5">
                  {history.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setViewingConv(conv)}
                      className="w-full text-left px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                    >
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(conv.createdAt, { addSuffix: true, locale: ptBR })} · {conv.messages.length} msg
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      )}

      {/* Chat tab */}
      {tab === 'chat' && (
        <>
          {/* Messages / Welcome */}
          <div className="flex-1 overflow-hidden">
            {isWelcome ? (
              <div className="flex flex-col h-full px-5 pt-10 pb-4">
                {/* Greeting */}
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Olá{firstName ? `, ${firstName}` : ''}! 👋
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Como posso te ajudar hoje?
                  </p>
                </div>

                {/* Suggestions list */}
                <div className="border border-border rounded-2xl overflow-hidden">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <div key={i}>
                      {i > 0 && <div className="border-t border-border" />}
                      <button
                        onClick={() => sendMessage(prompt)}
                        className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-left hover:bg-muted/40 transition-colors group"
                      >
                        <span className="text-foreground/80 group-hover:text-foreground transition-colors">{prompt}</span>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0 ml-3 group-hover:text-primary transition-colors" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full" ref={scrollRef as any}>
                <div className="p-4 space-y-4">
                  {messages.map(msg => (
                    <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-muted/50 border border-border/50 rounded-tl-sm'
                        )}
                      >
                        <MessageContent content={msg.content} />
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3 h-3 text-primary" />
                      </div>
                      <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm px-3.5 py-3">
                        <div className="flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 px-4 pb-4 pt-3">
            <div className="bg-muted/30 border border-border rounded-2xl px-4 pt-3 pb-2.5 focus-within:border-primary/50 transition-colors">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte qualquer coisa..."
                disabled={loading}
                className="w-full bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground max-h-32 min-h-[20px] leading-5 disabled:opacity-50"
                style={{ height: 'auto' }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground/70">Enter para enviar</span>
                <Button
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-xl"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
              O assistente pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// Renderiza markdown simples no conteúdo das mensagens
function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-primary mt-1.5 shrink-0">·</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        if (line.match(/^\d+\./)) {
          return <p key={i} className="pl-1">{line}</p>;
        }
        if (line === '') return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}
