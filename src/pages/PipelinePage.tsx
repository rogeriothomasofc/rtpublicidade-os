import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { UnifiedLeads } from '@/components/pipeline/UnifiedLeads';
import { CadenceReminders } from '@/components/pipeline/CadenceReminders';
import { ProspectionDashboard } from '@/components/pipeline/ProspectionDashboard';
import { PipelineWhatsAppCard } from '@/components/pipeline/PipelineWhatsAppCard';
import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { useIntegrations } from '@/hooks/useIntegrations';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, LayoutDashboard, MessageCircle } from 'lucide-react';

export default function PipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || localStorage.getItem('tab:pipeline') || 'dashboard'
  );
  const [waOpen, setWaOpen] = useState(false);

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    setSearchParams({ tab: v }, { replace: true });
    localStorage.setItem('tab:pipeline', v);
  };
  const { data: leads, isLoading } = useSalesPipeline();
  const { data: integrations } = useIntegrations();
  const pipelineWa = integrations?.find((i) => i.provider === 'evolution_api_pipeline');
  const isWaConnected = pipelineWa?.status === 'connected';

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
      <div className="space-y-4 animate-fade-in">
        <CadenceReminders />
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between gap-2">
            <TabsList className="h-9">
              <TabsTrigger value="dashboard" className="gap-1.5 text-sm">
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="gap-1.5 text-sm">
                <TrendingUp className="w-3.5 h-3.5" /> Pipeline
              </TabsTrigger>
              <TabsTrigger value="leads" className="gap-1.5 text-sm">
                <Users className="w-3.5 h-3.5" /> Leads
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setWaOpen(true)}
            >
              <MessageCircle className={`w-3.5 h-3.5 ${isWaConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="hidden sm:inline">WhatsApp</span>
              {isWaConnected && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            </Button>
          </div>
          <TabsContent value="dashboard" className="mt-4">
            <ProspectionDashboard />
          </TabsContent>
          <TabsContent value="pipeline" className="mt-4">
            <PipelineBoard leads={leads || []} />
          </TabsContent>
          <TabsContent value="leads" className="mt-4">
            <UnifiedLeads />
          </TabsContent>
        </Tabs>
      </div>
      <PipelineWhatsAppCard open={waOpen} onOpenChange={setWaOpen} />
    </MainLayout>
  );
}
