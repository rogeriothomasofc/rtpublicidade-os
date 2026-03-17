import { useState, useEffect, useRef } from 'react';
import whatsappBgLight from '@/assets/whatsapp-bg.png';
import whatsappBgDark from '@/assets/whatsapp-bg-dark.png';
import { SalesPipeline } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Loader2, Check, CheckCheck, Smile, Mic, Square, Paperclip } from 'lucide-react';
import { WhatsAppMediaRenderer } from './WhatsAppMediaRenderer';
import { WhatsAppSimpleHeader } from './WhatsAppSimpleHeader';
import { useWhatsAppPresence } from '@/hooks/useWhatsAppPresence';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { markMessagesAsRead } from '@/hooks/useUnreadMessages';
interface ChatMessage {
  id: string;
  direction: 'sent' | 'received';
  message: string;
  created_at: string;
  status: string;
  media_type?: string | null;
  media_url?: string | null;
}
interface WhatsAppChatPanelProps {
  lead: SalesPipeline;
  onBack?: () => void;
  showBackButton?: boolean;
  labels?: import('@/hooks/useWhatsAppContacts').WhatsAppLabel[];
  panelOpen?: boolean;
  onTogglePanel?: () => void;
}
export function WhatsAppChatPanel({
  lead,
  onBack,
  showBackButton,
  labels,
  panelOpen,
  onTogglePanel,
}: WhatsAppChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const {
    isOnline,
    isTyping,
    setTyping
  } = useWhatsAppPresence(lead.id);
  useEffect(() => {
    loadMessages();
    markMessagesAsRead(lead.id);
    queryClient.invalidateQueries({
      queryKey: ['whatsapp-contacts']
    });
    queryClient.invalidateQueries({
      queryKey: ['unread-messages']
    });
  }, [lead.id]);
  useEffect(() => {
    const channel = supabase.channel(`whatsapp-page-${lead.id}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'whatsapp_messages',
      filter: `lead_id=eq.${lead.id}`
    }, payload => {
      const newMsg = payload.new as ChatMessage;
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      if (newMsg.direction === 'received') {
        markMessagesAsRead(lead.id);
        queryClient.invalidateQueries({
          queryKey: ['whatsapp-contacts']
        });
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [lead.id]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, []);
  const loadMessages = async () => {
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('whatsapp-chat', {
        body: {
          action: 'history',
          lead_id: lead.id
        }
      });
      if (error) throw error;
      setMessages(data?.messages || []);
    } catch (err: any) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };
  const sendMessage = async () => {
    if (!newMessage.trim() || !lead.phone || sending) return;
    setSending(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('whatsapp-chat', {
        body: {
          action: 'send',
          lead_id: lead.id,
          phone: lead.phone,
          message: newMessage.trim()
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNewMessage('');
      await loadMessages();
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-contacts']
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };
  const uploadFileToStorage = async (file: Blob, fileName: string): Promise<string> => {
    const filePath = `${lead.id}/${Date.now()}_${fileName}`;
    const {
      error
    } = await supabase.storage.from('whatsapp-media').upload(filePath, file);
    if (error) throw error;
    const {
      data: urlData
    } = supabase.storage.from('whatsapp-media').getPublicUrl(filePath);
    return urlData.publicUrl;
  };
  const sendMedia = async (file: Blob, fileName: string, mediaType: 'audio' | 'image' | 'document') => {
    if (!lead.phone) return;
    setSending(true);
    try {
      const mediaUrl = await uploadFileToStorage(file, fileName);
      const {
        data,
        error
      } = await supabase.functions.invoke('whatsapp-chat', {
        body: {
          action: 'send_media',
          lead_id: lead.id,
          phone: lead.phone,
          media_url: mediaUrl,
          media_type: mediaType,
          file_name: fileName,
          caption: ''
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await loadMessages();
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-contacts']
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mídia');
    } finally {
      setSending(false);
    }
  };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: 'audio/ogg; codecs=opus'
        });
        if (blob.size > 0) await sendMedia(blob, 'audio.ogg', 'audio');
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch {
      toast.error('Não foi possível acessar o microfone');
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      await sendMedia(file, file.name, file.type.startsWith('image/') ? 'image' : 'document');
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const groupByDate = (msgs: ChatMessage[]) => {
    const groups: {
      date: string;
      messages: ChatMessage[];
    }[] = [];
    let cur = '';
    for (const msg of msgs) {
      const d = format(new Date(msg.created_at), 'dd/MM/yyyy');
      if (d !== cur) {
        cur = d;
        groups.push({
          date: d,
          messages: [msg]
        });
      } else groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  };
  const statusIcon = (status: string, dir: string) => {
    if (dir !== 'sent') return null;
    if (status === 'read') return <CheckCheck className="h-3 w-3 text-blue-400" />;
    if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-green-200/70" />;
    return <Check className="h-3 w-3 text-green-200/70" />;
  };
  const renderMedia = (msg: ChatMessage) => <WhatsAppMediaRenderer msg={msg} maxWidth="240px" />;
  const grouped = groupByDate(messages);
  const isDark = document.documentElement.classList.contains('dark');
  const bgImage = isDark ? whatsappBgDark : whatsappBgLight;
  return <div className="flex flex-col h-full bg-[#ECE5DD] dark:bg-[#0B141A]" style={{
    backgroundImage: `url(${bgImage})`,
    backgroundSize: '400px 400px',
    backgroundRepeat: 'repeat',
  }}>
      {/* Header */}
      <WhatsAppSimpleHeader lead={lead} onBack={onBack} showBackButton={showBackButton} panelOpen={panelOpen} onTogglePanel={onTogglePanel} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-1 min-h-0 py-[15px]">
        {loading ? <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div> : messages.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Send className="h-6 w-6 opacity-40" />
            </div>
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1">Envie a primeira mensagem para {lead.lead_name}</p>
          </div> : grouped.map(group => <div key={group.date}>
              <div className="flex justify-center my-2">
                <span className="bg-muted/80 text-muted-foreground text-[10px] px-3 py-0.5 rounded-full shadow-sm">
                  {group.date}
                </span>
              </div>
              {group.messages.map(msg => <div key={msg.id} className={`flex mb-1 ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`relative max-w-[65%] px-2.5 py-1.5 text-[13px] leading-[18px] shadow-sm ${msg.direction === 'sent' ? 'bg-[#DCF8C6] dark:bg-[#005C4B] text-foreground rounded-lg rounded-tr-sm' : 'bg-card text-foreground rounded-lg rounded-tl-sm'}`}>
                    {renderMedia(msg)}
                    {msg.message && <p className={`whitespace-pre-wrap ${msg.media_type ? 'mt-1' : ''} ${!msg.media_type ? 'pr-12' : ''}`}>
                        {msg.message}
                      </p>}
                    <span className={`${msg.media_type && !msg.message ? 'mt-1 block text-right' : 'absolute bottom-1 right-2'} flex items-center gap-0.5 text-[10px] ${msg.direction === 'sent' ? 'text-muted-foreground/70' : 'text-muted-foreground/60'}`}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                      {statusIcon(msg.status, msg.direction)}
                    </span>
                  </div>
                </div>)}
            </div>)}
      </div>

      {/* Input */}
      <div className="bg-[#F0F2F5] dark:bg-[#202C33] border-t border-[#D1D7DB] dark:border-[#313D45] px-3 shrink-0 py-[11px]">
        {!lead.phone ? <p className="text-xs text-muted-foreground text-center py-1">Lead sem telefone cadastrado</p> : isRecording ? <div className="flex gap-2 items-center">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-card rounded-full">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm text-destructive font-medium">{formatRecTime(recordingTime)}</span>
              <span className="text-xs text-muted-foreground">Gravando...</span>
            </div>
            <Button onClick={stopRecording} size="icon" className="shrink-0 h-9 w-9 rounded-full bg-destructive hover:bg-destructive/90">
              <Square className="h-4 w-4" />
            </Button>
          </div> : <div className="flex gap-1 items-center">
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground">
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-auto p-0 border-0 shadow-xl">
                <Picker data={data} onEmojiSelect={(emoji: any) => {
              setNewMessage(p => p + emoji.native);
              setEmojiOpen(false);
              inputRef.current?.focus();
            }} theme="auto" locale="pt" previewPosition="none" skinTonePosition="none" maxFrequentRows={2} />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile || sending}>
              {uploadingFile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={handleFileSelect} />

            <Input ref={inputRef} value={newMessage} onChange={e => {
          setNewMessage(e.target.value);
          setTyping(true);
        }} onKeyDown={handleKeyDown} placeholder="Mensagem" className="h-9 text-sm rounded-full bg-card border-border/50" />

            {newMessage.trim() ? <Button onClick={sendMessage} disabled={sending} size="icon" className="shrink-0 h-9 w-9 rounded-full bg-[#075E54] hover:bg-[#064E46] dark:bg-[#00A884] dark:hover:bg-[#00956F]">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button> : <Button onClick={startRecording} disabled={sending} size="icon" className="shrink-0 h-9 w-9 rounded-full bg-[#075E54] hover:bg-[#064E46] dark:bg-[#00A884] dark:hover:bg-[#00956F]">
                <Mic className="h-4 w-4" />
              </Button>}
          </div>}
      </div>
    </div>;
}