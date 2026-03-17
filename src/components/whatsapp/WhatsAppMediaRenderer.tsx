import { FileIcon, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaMessage {
  media_type?: string | null;
  media_url?: string | null;
}

interface WhatsAppMediaRendererProps {
  msg: MediaMessage;
  maxWidth?: string;
}

export function WhatsAppMediaRenderer({ msg, maxWidth = '240px' }: WhatsAppMediaRendererProps) {
  if (!msg.media_type || !msg.media_url) return null;

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileName = (url: string) => {
    const raw = url.split('/').pop() || 'Arquivo';
    const decoded = decodeURIComponent(raw);
    // Remove timestamp prefix like "1234567890_"
    const parts = decoded.split('_');
    return parts.length > 1 ? parts.slice(1).join('_') : decoded;
  };

  if (msg.media_type === 'audio') {
    return (
      <div className="flex flex-col gap-1">
        <audio controls className={`max-w-[${maxWidth}] h-8`} style={{ maxWidth }}>
          <source src={msg.media_url} />
        </audio>
        <button
          onClick={() => handleDownload(msg.media_url!, getFileName(msg.media_url!))}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors self-end"
        >
          <Download className="h-3 w-3" />
          Baixar áudio
        </button>
      </div>
    );
  }

  if (msg.media_type === 'image') {
    return (
      <div className="relative group">
        <img
          src={msg.media_url}
          alt="Imagem"
          className="rounded-md cursor-pointer"
          style={{ maxWidth }}
          onClick={() => window.open(msg.media_url!, '_blank')}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(msg.media_url!, getFileName(msg.media_url!));
          }}
          className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Download className="h-3.5 w-3.5 text-white" />
        </button>
      </div>
    );
  }

  if (msg.media_type === 'document') {
    const fileName = getFileName(msg.media_url);
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-black/5 dark:bg-white/5 rounded-md">
        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs flex-1" style={{ maxWidth: `calc(${maxWidth} - 60px)` }}>
          {fileName}
        </span>
        <button
          onClick={() => handleDownload(msg.media_url!, fileName)}
          className="shrink-0 h-6 w-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return null;
}
