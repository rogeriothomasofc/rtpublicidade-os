import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, Plus, Trash2, TrendingUp, DollarSign, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useClientProducts, useClientSales, useCreateClientProduct, useDeleteClientProduct, useCreateClientSale, useDeleteClientSale } from '@/hooks/useClientSales';

type FilterKey = 'hoje' | 'semana' | 'mes' | 'ano' | 'tudo';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: '7 dias' },
  { key: 'mes', label: 'Este mês' },
  { key: 'ano', label: 'Este ano' },
  { key: 'tudo', label: 'Tudo' },
];

interface Props {
  clientId?: string;
}

export function SalesPortalPanel({ clientId }: Props) {
  const [tab, setTab] = useState<'vendas' | 'produtos'>('vendas');
  const [filter, setFilter] = useState<FilterKey>('mes');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [newProduct, setNewProduct] = useState('');

  const { data: products = [], isLoading: loadingProducts } = useClientProducts(clientId);
  const { data: sales = [], isLoading: loadingSales } = useClientSales(clientId);
  const createProduct = useCreateClientProduct(clientId);
  const deleteProduct = useDeleteClientProduct(clientId);
  const createSale = useCreateClientSale(clientId);
  const deleteSale = useDeleteClientSale(clientId);

  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.created_at);
      if (filter === 'hoje') return d.toDateString() === now.toDateString();
      if (filter === 'semana') return (now.getTime() - d.getTime()) <= 7 * 86400000;
      if (filter === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (filter === 'ano') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [sales, filter]);

  const totalRevenue = filteredSales.reduce((s, v) => s + Number(v.amount), 0);
  const avgTicket = filteredSales.length ? totalRevenue / filteredSales.length : 0;

  const handleRegisterSale = async () => {
    if (!selectedProduct) { toast.error('Selecione um produto'); return; }
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error('Digite o valor da venda'); return; }
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    try {
      await createSale.mutateAsync({ productId: product.id, productName: product.name, amount: val });
      setSelectedProduct('');
      setAmount('');
      toast.success(`Venda de ${formatCurrency(val)} registrada!`);
    } catch {
      toast.error('Erro ao registrar venda');
    }
  };

  const handleAddProduct = async () => {
    const name = newProduct.trim();
    if (!name) { toast.error('Digite o nome do produto'); return; }
    if (products.find(p => p.name.toLowerCase() === name.toLowerCase())) { toast.error('Produto já cadastrado'); return; }
    try {
      await createProduct.mutateAsync(name);
      setNewProduct('');
      toast.success(`"${name}" cadastrado!`);
    } catch {
      toast.error('Erro ao cadastrar produto');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Produto removido');
    } catch {
      toast.error('Erro ao remover produto');
    }
  };

  const handleDeleteSale = async (id: string) => {
    try {
      await deleteSale.mutateAsync(id);
      toast.success('Venda removida');
    } catch {
      toast.error('Erro ao remover venda');
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-primary">{filteredSales.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Vendas</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-success">{formatCurrency(totalRevenue)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Receita</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-foreground">{formatCurrency(avgTicket)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Ticket médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'vendas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('vendas')}
          className="flex-1"
        >
          <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
          Vendas
        </Button>
        <Button
          variant={tab === 'produtos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('produtos')}
          className="flex-1"
        >
          <Package className="w-3.5 h-3.5 mr-1.5" />
          Produtos
        </Button>
      </div>

      {tab === 'vendas' && (
        <>
          {/* Register sale */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Registrar Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Selecione um produto...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegisterSale()}
                  className="pl-9 text-lg font-bold"
                  min="0"
                  step="0.01"
                />
              </div>
              <Button
                onClick={handleRegisterSale}
                disabled={createSale.isPending}
                className="w-full"
              >
                {createSale.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                Registrar Venda
              </Button>
            </CardContent>
          </Card>

          {/* History */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Histórico
              </CardTitle>
              <div className="flex gap-1.5 flex-wrap">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                      filter === f.key
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingSales ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : filteredSales.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Nenhuma venda neste período</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {filteredSales.map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2.5">
                      <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.product_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-success shrink-0">{formatCurrency(Number(s.amount))}</span>
                      <button
                        onClick={() => handleDeleteSale(s.id)}
                        className="w-7 h-7 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'produtos' && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Meus Produtos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do produto..."
                value={newProduct}
                onChange={e => setNewProduct(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddProduct()}
                className="flex-1"
                maxLength={60}
              />
              <Button onClick={handleAddProduct} disabled={createProduct.isPending} size="icon">
                {createProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
            {loadingProducts ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : products.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum produto cadastrado</p>
            ) : (
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2.5">
                    <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm font-medium">{p.name}</span>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="w-7 h-7 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
