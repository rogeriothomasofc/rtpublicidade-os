import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface MonthlyData {
  month: string;
  revenue: number;
  expense: number;
}

interface RevenueExpenseChartProps {
  data: MonthlyData[];
}

export function RevenueExpenseChart({ data }: RevenueExpenseChartProps) {
  const chartData = data.map(d => ({
    ...d,
    profit: d.revenue - d.expense,
  }));

  return (
    <Card className="border-border/50">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          Receita vs Despesas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--popover-foreground))'
              }}
            />
            <Legend />
            <Bar
              dataKey="expense"
              name="Despesas"
              fill="#ef4444"
              fillOpacity={0.7}
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
            <Line 
              type="monotone"
              dataKey="revenue" 
              name="Receita" 
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#22c55e' }}
            />
            <Line 
              type="monotone"
              dataKey="profit" 
              name="Lucro" 
              stroke="#eab308"
              strokeWidth={2}
              dot={{ fill: '#eab308', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#eab308' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}