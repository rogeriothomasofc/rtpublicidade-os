import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const stageColors: Record<string, string> = {
  Novo: '#3B82F6',
  'Qualificação': '#1D4ED8',
  'Diagnóstico': '#F59E0B',
  'Reunião Agendada': '#8B5CF6',
  'Proposta Enviada': '#F97316',
  'Negociação': '#A855F7',
  Ganho: '#22C55E',
  Perdido: '#EF4444',
};

export function PipelineFunnelCard() {
  const { data: pipeline, isLoading: pipelineLoading } = useSalesPipeline();
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const navigate = useNavigate();

  if (pipelineLoading || stagesLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full rounded-full" />
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const stageData = (stages || [])
    .filter(s => s.name !== 'Perdido')
    .map((stage) => {
      const leads = (pipeline || []).filter(p => p.stage === stage.name);
      const value = leads.reduce((sum, p) => sum + Number(p.deal_value), 0);
      return {
        name: stage.display_name,
        stageName: stage.name,
        count: leads.length,
        value,
      };
    });

  const totalValue = stageData.reduce((sum, s) => sum + s.value, 0);
  const totalLeads = stageData.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2 p-4 md:p-6 md:pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base md:text-lg">Pipeline de Vendas</CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">
            Valor total: {formatCurrency(totalValue)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs shrink-0 ml-2"
          onClick={() => navigate('/pipeline')}
        >
          Ver pipeline
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-2 md:pt-2">
        {/* Stacked bar */}
        {totalLeads > 0 && (
          <div className="flex h-2.5 md:h-3 rounded-full overflow-hidden">
            {stageData.map((stage) =>
              stage.count > 0 ? (
                <div
                  key={stage.stageName}
                  className="h-full transition-all"
                  style={{
                    width: `${(stage.count / totalLeads) * 100}%`,
                    backgroundColor: stageColors[stage.stageName] || '#6B7280',
                  }}
                />
              ) : null
            )}
          </div>
        )}

        {/* Stage rows */}
        <div className="space-y-1.5 md:space-y-2">
          {stageData.map((stage) => (
            <div
              key={stage.stageName}
              className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg bg-secondary/50"
            >
              <div
                className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shrink-0"
                style={{ backgroundColor: stageColors[stage.stageName] || '#6B7280' }}
              />
              <span className="text-xs md:text-sm font-medium text-foreground flex-1 truncate">{stage.name}</span>
              <span className="text-[10px] md:text-sm text-muted-foreground shrink-0">{stage.count}</span>
              <span className="text-xs md:text-sm font-bold text-foreground shrink-0">
                {formatCurrency(stage.value)}
              </span>
            </div>
          ))}
        </div>

        {stageData.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado de pipeline</p>
        )}
      </CardContent>
    </Card>
  );
}
