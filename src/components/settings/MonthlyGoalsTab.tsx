import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useMonthlyGoals, useCurrentMonthGoal, useSaveMonthlyGoal } from '@/hooks/useMonthlyGoals';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Target, Sparkles, History, Loader2, Save, ChevronDown, ChevronUp, Users, DollarSign, UserPlus } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MonthlyGoalsTab() {
  const { data: allGoals, isLoading: loadingAll } = useMonthlyGoals();
  const { data: currentGoal, isLoading: loadingCurrent } = useCurrentMonthGoal();
  const saveGoal = useSaveMonthlyGoal();
  const { toast } = useToast();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({
    clients_to_close: 0,
    revenue_target: 0,
    leads_per_day: 0,
    leads_per_month: 0,
  });
  const [aiPlan, setAiPlan] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  useEffect(() => {
    if (currentGoal) {
      setForm({
        clients_to_close: currentGoal.clients_to_close,
        revenue_target: currentGoal.revenue_target,
        leads_per_day: currentGoal.leads_per_day,
        leads_per_month: currentGoal.leads_per_month,
      });
      setAiPlan(currentGoal.ai_action_plan);
    }
  }, [currentGoal]);

  const handleSave = async () => {
    await saveGoal.mutateAsync({
      month: currentMonth,
      ...form,
      ai_action_plan: aiPlan,
    });
  };

  const handleGeneratePlan = async () => {
    if (!form.clients_to_close && !form.revenue_target && !form.leads_per_day && !form.leads_per_month) {
      toast({ title: 'Defina pelo menos uma meta antes de gerar o plano', variant: 'destructive' });
      return;
    }

    setGeneratingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke('goals-action-plan', {
        body: { goals: form },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: data.error, variant: 'destructive' });
        return;
      }

      setAiPlan(data.plan);
      // Auto-save with plan
      await saveGoal.mutateAsync({
        month: currentMonth,
        ...form,
        ai_action_plan: data.plan,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao gerar plano', description: message, variant: 'destructive' });
    } finally {
      setGeneratingPlan(false);
    }
  };

  const formatMonthLabel = (month: string) => {
    try {
      const date = parse(month, 'yyyy-MM', new Date());
      return format(date, "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return month;
    }
  };

  const pastGoals = allGoals?.filter(g => g.month !== currentMonth) || [];

  if (loadingCurrent || loadingAll) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current month goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Metas de {formatMonthLabel(currentMonth)}</CardTitle>
          </div>
          <CardDescription>Defina suas metas e gere um plano de ação com IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Clientes para fechar
              </Label>
              <Input
                type="number"
                min={0}
                value={form.clients_to_close}
                onChange={(e) => setForm(f => ({ ...f, clients_to_close: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Meta de faturamento (R$)
              </Label>
              <Input
                type="number"
                min={0}
                value={form.revenue_target}
                onChange={(e) => setForm(f => ({ ...f, revenue_target: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Leads por dia
              </Label>
              <Input
                type="number"
                min={0}
                value={form.leads_per_day}
                onChange={(e) => setForm(f => ({ ...f, leads_per_day: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Leads por mês
              </Label>
              <Input
                type="number"
                min={0}
                value={form.leads_per_month}
                onChange={(e) => setForm(f => ({ ...f, leads_per_month: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saveGoal.isPending} variant="outline">
              {saveGoal.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              Salvar metas
            </Button>
            <Button onClick={handleGeneratePlan} disabled={generatingPlan}>
              {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              {aiPlan ? 'Regerar plano com IA' : 'Gerar plano de ação com IA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Action Plan */}
      {aiPlan && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Plano de Ação</CardTitle>
            </div>
            <CardDescription>Gerado por IA com base nas suas metas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {aiPlan.split('\n').map((line, i) => {
                if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold mt-4 mb-1">{line.replace('### ', '')}</h3>;
                if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-5 mb-2">{line.replace('## ', '')}</h2>;
                if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-5 mb-2">{line.replace('# ', '')}</h1>;
                if (line.startsWith('- **')) {
                  const parts = line.replace('- **', '').split('**');
                  return <p key={i} className="ml-4 my-0.5">• <strong>{parts[0]}</strong>{parts.slice(1).join('')}</p>;
                }
                if (line.startsWith('- ')) return <p key={i} className="ml-4 my-0.5">• {line.replace('- ', '')}</p>;
                if (line.trim() === '') return <br key={i} />;
                return <p key={i} className="my-0.5">{line}</p>;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {pastGoals.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowHistory(!showHistory)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-lg">Histórico de Metas</CardTitle>
              </div>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            <CardDescription>{pastGoals.length} mês(es) anteriores</CardDescription>
          </CardHeader>
          {showHistory && (
            <CardContent className="space-y-3">
              {pastGoals.map((goal) => (
                <div key={goal.id} className="border rounded-lg p-4 space-y-2">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                  >
                    <h4 className="font-semibold capitalize">{formatMonthLabel(goal.month)}</h4>
                    {expandedGoal === goal.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Clientes:</span>{' '}
                      <strong>{goal.clients_to_close}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Faturamento:</span>{' '}
                      <strong>R$ {Number(goal.revenue_target).toLocaleString('pt-BR')}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Leads/dia:</span>{' '}
                      <strong>{goal.leads_per_day}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Leads/mês:</span>{' '}
                      <strong>{goal.leads_per_month}</strong>
                    </div>
                  </div>
                  {expandedGoal === goal.id && goal.ai_action_plan && (
                    <>
                      <Separator />
                      <div className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                        {goal.ai_action_plan}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
