import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { usePlanningCampaign } from '@/hooks/usePlanning';
import { PlanningOverviewTab } from '@/components/planning/PlanningOverviewTab';
import { PlanningStructuresTab } from '@/components/planning/PlanningStructuresTab';
import { PlanningAudiencesTab } from '@/components/planning/PlanningAudiencesTab';
import { PlanningCreativesTab } from '@/components/planning/PlanningCreativesTab';
import { PlanningForecastsTab } from '@/components/planning/PlanningForecastsTab';
import { PlanningTestsTab } from '@/components/planning/PlanningTestsTab';
import { PlanningChecklistTab } from '@/components/planning/PlanningChecklistTab';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlanningDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { data: campaign, isLoading } = usePlanningCampaign(id!);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!campaign) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Planejamento não encontrado</p>
          <Button variant="link" onClick={() => navigate('/planning')}>Voltar</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/planning')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground">{campaign.client?.name || 'Sem cliente'} · {campaign.platform}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })} className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0 border-b rounded-none">
            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">📌 Overview</TabsTrigger>
            <TabsTrigger value="structures" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">🎯 Estrutura</TabsTrigger>
            <TabsTrigger value="audiences" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">👥 Públicos</TabsTrigger>
            <TabsTrigger value="creatives" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">🎨 Criativos</TabsTrigger>
            <TabsTrigger value="forecasts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">📊 Projeções</TabsTrigger>
            <TabsTrigger value="tests" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">🧪 Testes</TabsTrigger>
            <TabsTrigger value="checklist" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">✅ Checklist</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><PlanningOverviewTab campaign={campaign} planningId={id!} /></TabsContent>
          <TabsContent value="structures"><PlanningStructuresTab planningId={id!} /></TabsContent>
          <TabsContent value="audiences"><PlanningAudiencesTab planningId={id!} /></TabsContent>
          <TabsContent value="creatives"><PlanningCreativesTab planningId={id!} /></TabsContent>
          <TabsContent value="forecasts"><PlanningForecastsTab planningId={id!} /></TabsContent>
          <TabsContent value="tests"><PlanningTestsTab planningId={id!} /></TabsContent>
          <TabsContent value="checklist"><PlanningChecklistTab planningId={id!} /></TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
