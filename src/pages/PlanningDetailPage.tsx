import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, LayoutDashboard, Network, BarChart2, FlaskConical, CheckSquare, Pencil } from 'lucide-react';
import {
  usePlanningCampaign, useUpdatePlanningCampaign,
  usePlanningAdSets, usePlanningAds, usePlanningChecklists,
  type PlanningStatus,
} from '@/hooks/usePlanning';
import { PlanningOverviewTab } from '@/components/planning/PlanningOverviewTab';
import { PlanningAdSetsTab } from '@/components/planning/PlanningAdSetsTab';
import { PlanningForecastsTab } from '@/components/planning/PlanningForecastsTab';
import { PlanningTestsTab } from '@/components/planning/PlanningTestsTab';
import { PlanningChecklistTab } from '@/components/planning/PlanningChecklistTab';
import { NewPlanningDialog } from '@/components/planning/NewPlanningDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: PlanningStatus[] = ['Rascunho', 'Em Aprovação', 'Pronto para Subir', 'Publicado', 'Em Teste', 'Escalando', 'Pausado'];

const statusColors: Record<PlanningStatus, string> = {
  'Rascunho':          'bg-muted text-muted-foreground',
  'Em Aprovação':      'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'Pronto para Subir': 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'Publicado':         'bg-green-500/15 text-green-700 dark:text-green-400',
  'Em Teste':          'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  'Escalando':         'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'Pausado':           'bg-red-500/15 text-red-600 dark:text-red-400',
};

export default function PlanningDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || localStorage.getItem(`tab:planning:${id}`) || 'overview'
  );
  const [editOpen, setEditOpen] = useState(false);

  const { data: campaign, isLoading } = usePlanningCampaign(id!);
  const updateMutation = useUpdatePlanningCampaign();

  // Tab counters
  const { data: adSets = [] } = usePlanningAdSets(id!);
  const { data: ads = [] } = usePlanningAds(id!);
  const { data: checklists = [] } = usePlanningChecklists(id!);

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    setSearchParams({ tab: v }, { replace: true });
    localStorage.setItem(`tab:planning:${id}`, v);
  };

  const tabs = [
    { value: 'overview',  label: 'Overview',         icon: LayoutDashboard, count: null },
    { value: 'adsets',    label: 'Conjuntos',         icon: Network,         count: adSets.length > 0 ? `${adSets.length} · ${ads.length} ads` : null },
    { value: 'forecasts', label: 'Projeções',         icon: BarChart2,       count: null },
    { value: 'tests',     label: 'Testes A/B',        icon: FlaskConical,    count: null },
    { value: 'checklist', label: 'Checklist',         icon: CheckSquare,     count: checklists.length > 0 ? `${checklists.filter(c => c.is_completed).length}/${checklists.length}` : null },
  ];

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
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => navigate('/planning')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{campaign.name}</h1>
              {/* Status inline */}
              <Select value={campaign.status} onValueChange={val => updateMutation.mutate({ id: campaign.id, status: val as PlanningStatus })}>
                <SelectTrigger className="h-6 w-auto border-none shadow-none px-1 focus:ring-0 hover:bg-muted/50">
                  <Badge className={statusColors[campaign.status]} variant="secondary">{campaign.status}</Badge>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>
                      <Badge className={statusColors[s]} variant="secondary">{s}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {campaign.client?.name || 'Sem cliente'} · {campaign.platform}
              {campaign.objective && ` · ${campaign.objective}`}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-0.5 bg-transparent p-0 border-b rounded-none overflow-x-auto">
            {tabs.map(({ value, label, icon: Icon, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'gap-1.5 rounded-none border-b-2 border-transparent pb-2 px-3',
                  'data-[state=active]:border-primary data-[state=active]:text-foreground',
                  'data-[state=inactive]:text-muted-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm">{label}</span>
                {count !== null && count !== '' && (
                  <span className="text-xs bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-medium leading-none">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">  <PlanningOverviewTab campaign={campaign} planningId={id!} /></TabsContent>
          <TabsContent value="adsets">   <PlanningAdSetsTab planningId={id!} /></TabsContent>
          <TabsContent value="forecasts"><PlanningForecastsTab planningId={id!} /></TabsContent>
          <TabsContent value="tests">    <PlanningTestsTab planningId={id!} /></TabsContent>
          <TabsContent value="checklist"><PlanningChecklistTab planningId={id!} /></TabsContent>
        </Tabs>
      </div>

      <NewPlanningDialog open={editOpen} onOpenChange={setEditOpen} editCampaign={campaign} />
    </MainLayout>
  );
}
