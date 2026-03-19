import { ShieldOff, Mail } from 'lucide-react';

// E-mail de suporte do dono do sistema
const SUPPORT_EMAIL = 'contato@rtpublicidade.com.br';

export default function LicenseSuspendedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="w-10 h-10 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Acesso suspenso</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            A licença deste sistema foi suspensa ou é inválida.
            Entre em contato com o suporte para reativar o acesso.
          </p>
        </div>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Contatar suporte
        </a>

        <p className="text-xs text-muted-foreground">
          Licença: {import.meta.env.VITE_LICENSE_KEY || '—'}
        </p>
      </div>
    </div>
  );
}
