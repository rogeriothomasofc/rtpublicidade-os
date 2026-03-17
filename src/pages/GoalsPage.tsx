import { MainLayout } from '@/components/layout/MainLayout';
import { MonthlyGoalsTab } from '@/components/settings/MonthlyGoalsTab';

export default function GoalsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas Mensais</h1>
          <p className="text-muted-foreground">Defina suas metas, gere planos de ação com IA e acompanhe seu histórico.</p>
        </div>
        <MonthlyGoalsTab />
      </div>
    </MainLayout>
  );
}
