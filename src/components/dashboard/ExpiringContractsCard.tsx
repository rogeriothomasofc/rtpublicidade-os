import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContracts } from '@/hooks/useContracts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { addDays, differenceInDays } from 'date-fns';

export function ExpiringContractsCard() {
  const { data: contracts, isLoading } = useContracts();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader><Skeleton className="h-5 w-44" /></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </CardContent>
      </Card>
    );
  }

  const today = new Date();
  const expiringContracts = (contracts || [])
    .filter((c: any) => {
      if (c.status !== 'Ativo') return false;
      const endDate = c.end_date
        ? new Date(c.end_date + 'T12:00:00')
        : c.duration_months
          ? addDays(new Date(c.start_date + 'T12:00:00'), c.duration_months * 30)
          : null;
      if (!endDate) return false;
      const daysLeft = differenceInDays(endDate, today);
      return daysLeft >= 0 && daysLeft <= 60;
    })
    .map((c: any) => {
      const endDate = c.end_date
        ? new Date(c.end_date + 'T12:00:00')
        : addDays(new Date(c.start_date + 'T12:00:00'), (c.duration_months || 12) * 30);
      const daysLeft = differenceInDays(endDate, today);
      return { ...c, endDate, daysLeft };
    })
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const getDateColor = (daysLeft: number) => {
    if (daysLeft <= 15) return 'text-destructive bg-destructive/15 border-destructive/30';
    if (daysLeft <= 30) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    return 'text-green-400 bg-green-500/15 border-green-500/30';
  };

  const getDotColor = (daysLeft: number) => {
    if (daysLeft <= 15) return 'bg-destructive';
    if (daysLeft <= 30) return 'bg-amber-400';
    return 'bg-green-400';
  };

  const getRecurrenceLabel = (c: any) => {
    if (c.duration_months === 1) return 'Mensal';
    if (c.duration_months === 3) return 'Trimestral';
    if (c.duration_months === 6) return 'Semestral';
    if (c.duration_months === 12) return 'Anual';
    return c.duration_months ? `${c.duration_months}m` : 'Contrato';
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2 p-4 md:p-6 md:pb-2">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <CalendarDays className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          Contratos Vencendo
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="text-xs shrink-0"
          onClick={() => navigate('/contracts')}
        >
          Ver todos
        </Button>
      </CardHeader>
      <CardContent className="space-y-1.5 md:space-y-2 p-4 md:p-6 pt-2 md:pt-2">
        {expiringContracts.length > 0 ? (
          expiringContracts.map((c: any) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg bg-secondary/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-foreground truncate">
                  {c.client?.name || c.description || 'Contrato'}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  {getRecurrenceLabel(c)} · {formatCurrency(c.value)}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] md:text-xs font-medium px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border shrink-0 ${getDateColor(c.daysLeft)}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(c.daysLeft)}`} />
                {formatDate(c.endDate.toISOString())}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum contrato vencendo nos próximos 60 dias 🎉
          </p>
        )}
      </CardContent>
    </Card>
  );
}
