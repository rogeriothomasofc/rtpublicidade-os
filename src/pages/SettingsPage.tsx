import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plug, User, Building2, Target, Megaphone } from 'lucide-react';
import { IntegrationsTab } from '@/components/settings/IntegrationsTab';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { AgencyTab } from '@/components/settings/AgencyTab';
import { MonthlyGoalsTab } from '@/components/settings/MonthlyGoalsTab';
import { AnnouncementsTab } from '@/components/settings/AnnouncementsTab';

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || localStorage.getItem('tab:settings') || 'integrations'
  );

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    setSearchParams({ tab: v }, { replace: true });
    localStorage.setItem('tab:settings', v);
  };
  return (
    <MainLayout>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto gap-1 justify-start flex-nowrap min-w-max">
              <TabsTrigger value="integrations" className="gap-1.5 shrink-0">
                <Plug className="w-4 h-4" />
                Integrações
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1.5 shrink-0">
                <User className="w-4 h-4" />
                Meu Perfil
              </TabsTrigger>
              <TabsTrigger value="agency" className="gap-1.5 shrink-0">
                <Building2 className="w-4 h-4" />
                Agência
              </TabsTrigger>
              <TabsTrigger value="goals" className="gap-1.5 shrink-0">
                <Target className="w-4 h-4" />
                Metas
              </TabsTrigger>
              <TabsTrigger value="announcements" className="gap-1.5 shrink-0">
                <Megaphone className="w-4 h-4" />
                Avisos
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="integrations">
            <IntegrationsTab />
          </TabsContent>
          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>
          <TabsContent value="agency">
            <AgencyTab />
          </TabsContent>
          <TabsContent value="goals">
            <MonthlyGoalsTab />
          </TabsContent>
          <TabsContent value="announcements">
            <AnnouncementsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
