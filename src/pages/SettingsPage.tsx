import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plug, User, Building2, Target, Megaphone } from 'lucide-react';
import { IntegrationsTab } from '@/components/settings/IntegrationsTab';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { AgencyTab } from '@/components/settings/AgencyTab';
import { MonthlyGoalsTab } from '@/components/settings/MonthlyGoalsTab';
import { AnnouncementsTab } from '@/components/settings/AnnouncementsTab';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie integrações, perfil e dados da agência.</p>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <TabsList className="w-full h-auto flex-wrap gap-1 justify-start">
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="w-4 h-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Meu Perfil
            </TabsTrigger>
            <TabsTrigger value="agency" className="gap-2">
              <Building2 className="w-4 h-4" />
              Agência
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Target className="w-4 h-4" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2">
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
