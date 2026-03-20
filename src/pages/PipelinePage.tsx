import { MainLayout } from '@/components/layout/MainLayout';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

export default function PipelinePage() {
  const { data: leads, isLoading } = useSalesPipeline();

  const totalPipelineValue = leads?.filter(l => l.stage !== 'Perdido' && l.stage !== 'Ganho')
    .reduce((sum, l) => sum + Number(l.deal_value), 0) || 0;
  
  const weightedValue = leads?.filter(l => l.stage !== 'Perdido' && l.stage !== 'Ganho')
    .reduce((sum, l) => sum + (Number(l.deal_value) * l.probability / 100), 0) || 0;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-72 h-96 bg-secondary/50 rounded-lg p-4">
                <Skeleton className="h-6 w-24 mb-4" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PipelineBoard leads={leads || []} />
      </div>
    </MainLayout>
  );
}
