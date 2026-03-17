import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Bug, Sparkles, Wrench, Zap } from 'lucide-react';

type ChangeType = 'feature' | 'fix' | 'improvement' | 'bugfix';

interface ChangeEntry {
  type: ChangeType;
  description: string;
}

interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  changes: ChangeEntry[];
}

const typeConfig: Record<ChangeType, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  feature: { label: 'Novidade', icon: Sparkles, variant: 'default' },
  improvement: { label: 'Melhoria', icon: Zap, variant: 'secondary' },
  fix: { label: 'Correção', icon: Wrench, variant: 'outline' },
  bugfix: { label: 'Bug Fix', icon: Bug, variant: 'destructive' },
};

const releaseNotes: ReleaseNote[] = [
  {
    version: '1.5.0',
    date: '27/02/2026',
    title: 'Changelog & Edição de Planejamentos',
    changes: [
      { type: 'feature', description: 'Página de atualizações do sistema em Configurações' },
      { type: 'feature', description: 'Edição completa de Estruturas, Públicos, Criativos, Projeções, Testes e Checklists nos planejamentos' },
      { type: 'feature', description: 'Notificações automáticas para lembretes de leads' },
      { type: 'improvement', description: 'Edição inline de perfil de leads no painel WhatsApp' },
    ],
  },
  {
    version: '1.4.0',
    date: '26/02/2026',
    title: 'Planejamentos & WhatsApp',
    changes: [
      { type: 'feature', description: 'Módulo completo de Planejamento de Campanhas com IA' },
      { type: 'feature', description: 'Chat WhatsApp integrado com pipeline de vendas' },
      { type: 'feature', description: 'Lembretes de follow-up para leads' },
      { type: 'improvement', description: 'Labels e filtros nos contatos do WhatsApp' },
    ],
  },
  {
    version: '1.3.0',
    date: '25/02/2026',
    title: 'Pipeline & Propostas',
    changes: [
      { type: 'feature', description: 'Pipeline de vendas com kanban drag & drop' },
      { type: 'feature', description: 'Geração de propostas em PDF' },
      { type: 'feature', description: 'Etapas customizáveis do pipeline com atividades' },
      { type: 'improvement', description: 'Perfil detalhado de leads com histórico de atividades' },
      { type: 'fix', description: 'Correção na ordenação de cards do kanban' },
    ],
  },
  {
    version: '1.2.0',
    date: '24/02/2026',
    title: 'Portal do Cliente & Automações',
    changes: [
      { type: 'feature', description: 'Portal do cliente com acesso por convite' },
      { type: 'feature', description: 'Motor de automações com regras configuráveis' },
      { type: 'feature', description: 'Resumo IA do portal do cliente' },
      { type: 'improvement', description: 'Logs de acesso do portal para acompanhamento' },
      { type: 'bugfix', description: 'Fix no cálculo de métricas do dashboard com filtro de período' },
    ],
  },
  {
    version: '1.1.0',
    date: '23/02/2026',
    title: 'Financeiro & Equipe',
    changes: [
      { type: 'feature', description: 'Módulo financeiro com contas a pagar/receber' },
      { type: 'feature', description: 'Gestão de contas bancárias e categorias' },
      { type: 'feature', description: 'Gerenciamento de equipe com papéis' },
      { type: 'improvement', description: 'Dashboard com métricas agregadas server-side' },
      { type: 'fix', description: 'Correção na criação atômica de tarefas com subtarefas' },
    ],
  },
  {
    version: '1.0.0',
    date: '22/02/2026',
    title: 'Lançamento Inicial',
    changes: [
      { type: 'feature', description: 'Dashboard com visão geral de métricas' },
      { type: 'feature', description: 'Gestão de clientes, projetos e tarefas' },
      { type: 'feature', description: 'Contratos com geração de PDF' },
      { type: 'feature', description: 'PWA com suporte offline e push notifications' },
      { type: 'feature', description: 'Autenticação e controle de acesso' },
    ],
  },
];

export function ChangelogTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Atualizações do Sistema</h2>
          <p className="text-sm text-muted-foreground">Histórico de versões, melhorias e correções.</p>
        </div>
        <Badge variant="outline" className="text-sm font-mono">
          v{releaseNotes[0]?.version}
        </Badge>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

        <div className="space-y-6">
          {releaseNotes.map((release, idx) => (
            <div key={release.version} className="relative pl-12">
              {/* Timeline dot */}
              <div className={`absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 ${idx === 0 ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/40'}`} />

              <Card>
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant={idx === 0 ? 'default' : 'secondary'} className="font-mono text-xs">
                      v{release.version}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{release.date}</span>
                  </div>
                  <h3 className="font-semibold mb-3">{release.title}</h3>
                  <ul className="space-y-2">
                    {release.changes.map((change, i) => {
                      const config = typeConfig[change.type];
                      const Icon = config.icon;
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Badge variant={config.variant} className="text-[10px] px-1.5 py-0 h-5 shrink-0 mt-0.5">
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                          <span className="text-muted-foreground">{change.description}</span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
