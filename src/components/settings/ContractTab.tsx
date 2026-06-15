import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAgencySettings, useUpdateAgencySettings, ContractClauses } from '@/hooks/useAgencySettings';
import { Save, RotateCcw, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

const CLAUSE_FIELDS: { key: keyof ContractClauses; label: string; hint: string; rows: number }[] = [
  {
    key: 'objeto',
    label: 'Cláusula 1 — Objeto',
    hint: 'Descreve o serviço prestado.',
    rows: 4,
  },
  {
    key: 'pagamento',
    label: 'Cláusula 2 — Pagamento',
    hint: 'Use {{VALOR}} para o fee mensal e {{DIA}} para o dia de vencimento. Inclua os parágrafos de multa e tolerância separados por linha em branco.',
    rows: 7,
  },
  {
    key: 'obrigacoes_contratante',
    label: 'Cláusula 3 — Obrigações do Contratante',
    hint: 'Liste cada obrigação em uma linha, começando com a), b), c)…',
    rows: 4,
  },
  {
    key: 'obrigacoes_contratada',
    label: 'Cláusula 4 — Obrigações da Contratada',
    hint: 'Liste cada obrigação em uma linha, começando com a), b), c)…',
    rows: 4,
  },
  {
    key: 'valor_anuncios',
    label: 'Cláusulas 5 e 6 — Valor para Anúncios',
    hint: 'Use {{VERBA_TEXTO}} para incluir a verba de mídia (se informada). Descreva plataformas e responsabilidades.',
    rows: 6,
  },
  {
    key: 'estrategia',
    label: 'Cláusula 7 — Estratégia',
    hint: 'Descreva as regras de estratégia e responsabilidades. Parágrafos separados por linha em branco.',
    rows: 6,
  },
  {
    key: 'nao_exclusividade',
    label: 'Cláusula 8 — Não Exclusividade',
    hint: 'Declara que não há vínculo empregatício.',
    rows: 3,
  },
  {
    key: 'confidencialidade',
    label: 'Cláusula 9 — Confidencialidade',
    hint: 'Sigilo das informações. Parágrafo único separado por linha em branco.',
    rows: 4,
  },
  {
    key: 'duracao',
    label: 'Cláusula 10 — Duração',
    hint: 'Use {{MESES}} para a duração em meses por extenso (ex: "12 (doze)").',
    rows: 3,
  },
  {
    key: 'reajuste',
    label: 'Cláusula 11 — Reajuste Anual (IPCA)',
    hint: 'Regras de reajuste anual. Parágrafo único separado por linha em branco.',
    rows: 4,
  },
  {
    key: 'rescisao',
    label: 'Cláusula 12 — Rescisão',
    hint: 'Use {{MULTA}} para o valor da multa rescisória (igual ao fee). Parágrafos separados por linha em branco.',
    rows: 6,
  },
  {
    key: 'disposicoes',
    label: 'Cláusulas 13, 14 e 15 — Disposições Gerais',
    hint: 'Cada cláusula em um parágrafo separado por linha em branco.',
    rows: 5,
  },
  {
    key: 'foro',
    label: 'Cláusula Final — Foro',
    hint: 'Use {{CIDADE}} e {{ESTADO}} para a cidade e estado da agência.',
    rows: 2,
  },
];

const PLACEHOLDERS_HELP = [
  { placeholder: '{{VALOR}}', desc: 'Fee mensal formatado (ex: R$ 1.900,00)' },
  { placeholder: '{{VERBA}}', desc: 'Verba de mídia formatada' },
  { placeholder: '{{VERBA_TEXTO}}', desc: 'Trecho com verba de mídia (só aparece se informada)' },
  { placeholder: '{{MESES}}', desc: 'Duração por extenso (ex: 12 (doze))' },
  { placeholder: '{{DIA}}', desc: 'Dia de pagamento por extenso (ex: 5 (cinco))' },
  { placeholder: '{{MULTA}}', desc: 'Multa rescisória (igual ao fee)' },
  { placeholder: '{{CIDADE}}', desc: 'Cidade da agência' },
  { placeholder: '{{ESTADO}}', desc: 'Estado da agência' },
];

export function ContractTab() {
  const { data: settings, isLoading } = useAgencySettings();
  const update = useUpdateAgencySettings();

  const [clauses, setClauses] = useState<ContractClauses>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings?.contract_clauses) {
      setClauses(settings.contract_clauses);
      setDirty(false);
    }
  }, [settings?.contract_clauses]);

  const handleChange = (key: keyof ContractClauses, value: string) => {
    setClauses(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleReset = (key: keyof ContractClauses) => {
    setClauses(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDirty(true);
    toast.success('Cláusula redefinida para o padrão.');
  };

  const handleSave = async () => {
    if (!settings) return;
    await update.mutateAsync({ id: settings.id, contract_clauses: clauses } as any);
    setDirty(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Modelo de Contrato</h2>
        <p className="text-sm text-muted-foreground">
          Personalize o texto de cada cláusula. Deixe em branco para usar o texto padrão.
        </p>
      </div>

      {/* Placeholders reference */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Variáveis disponíveis
          </CardTitle>
          <CardDescription className="text-xs">
            Use estas variáveis no texto das cláusulas — elas são substituídas automaticamente ao gerar o PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PLACEHOLDERS_HELP.map(({ placeholder, desc }) => (
              <div key={placeholder} className="flex items-start gap-2 text-xs">
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono shrink-0 text-primary">{placeholder}</code>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clause editors */}
      <div className="space-y-4">
        {CLAUSE_FIELDS.map(({ key, label, hint, rows }) => (
          <Card key={key} className="border-border/50">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Label className="text-sm font-semibold">{label}</Label>
                {clauses[key] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground gap-1 shrink-0"
                    onClick={() => handleReset(key)}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Redefinir padrão
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{hint}</p>
              <Textarea
                rows={rows}
                value={clauses[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder="Deixe em branco para usar o texto padrão…"
                className="text-sm font-mono resize-y"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || update.isPending} className="gap-2">
          {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {update.isPending ? 'Salvando...' : 'Salvar Cláusulas'}
        </Button>
      </div>
    </div>
  );
}
