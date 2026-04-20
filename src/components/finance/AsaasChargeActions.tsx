import { useState } from 'react';
import { Finance } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Zap, ExternalLink, Copy, QrCode, Trash2, RefreshCw } from 'lucide-react';
import { useAsaasCreateCharge, useAsaasCancelCharge, useAsaasGetPixQr, useAsaasSyncCharges, useAsaasBulkCreateCharges, useAsaasImportCharges } from '@/hooks/useAsaas';
import { toast } from 'sonner';
import { useIntegrations } from '@/hooks/useIntegrations';

interface AsaasChargeActionsProps {
  finance: Finance;
}

type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

const BILLING_LABELS: Record<BillingType, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto Bancário',
  CREDIT_CARD: 'Cartão de Crédito',
};

export function AsaasChargeActions({ finance }: AsaasChargeActionsProps) {
  const { data: integrations } = useIntegrations();
  const asaasConnected = integrations?.find(i => i.provider === 'asaas')?.status === 'connected';

  const createCharge = useAsaasCreateCharge();
  const cancelCharge = useAsaasCancelCharge();
  const getPixQr = useAsaasGetPixQr();

  const [createDialog, setCreateDialog] = useState(false);
  const [billingType, setBillingType] = useState<BillingType>('PIX');
  const [pixDialog, setPixDialog] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);

  if (!asaasConnected || finance.type !== 'Receita') return null;

  const hasCharge = !!finance.asaas_charge_id;
  const isPaid = finance.status === 'Pago';

  const handleCreate = async () => {
    await createCharge.mutateAsync({ finance_id: finance.id, billing_type: billingType });
    setCreateDialog(false);
  };

  const handleShowPix = async () => {
    const data = await getPixQr.mutateAsync(finance.id);
    if (data?.pixQrCode) {
      setPixCode(data.pixQrCode);
      setPixDialog(true);
    } else {
      toast.error('PIX ainda não disponível');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancelar esta cobrança no Asaas?')) return;
    await cancelCharge.mutateAsync(finance.id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  // No charge yet
  if (!hasCharge) {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs h-7 border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => setCreateDialog(true)}
          disabled={createCharge.isPending || isPaid}
        >
          {createCharge.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Cobrar via Asaas
        </Button>

        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Gerar Cobrança no Asaas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={billingType} onValueChange={v => setBillingType(v as BillingType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BILLING_LABELS) as BillingType[]).map(t => (
                      <SelectItem key={t} value={t}>{BILLING_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createCharge.isPending}>
                {createCharge.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Gerar Cobrança
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Has charge
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge
            variant="outline"
            className="cursor-pointer gap-1 border-primary/40 text-primary bg-primary/5 hover:bg-primary/15 transition-colors text-[10px] px-2"
          >
            <Zap className="w-2.5 h-2.5" />
            Asaas
            {finance.asaas_billing_type && (
              <span className="text-muted-foreground">· {BILLING_LABELS[finance.asaas_billing_type as BillingType] || finance.asaas_billing_type}</span>
            )}
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {finance.asaas_payment_url && (
            <DropdownMenuItem asChild>
              <a href={finance.asaas_payment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir link
              </a>
            </DropdownMenuItem>
          )}
          {finance.asaas_payment_url && (
            <DropdownMenuItem onClick={() => copyToClipboard(finance.asaas_payment_url!)}>
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copiar link
            </DropdownMenuItem>
          )}
          {finance.asaas_billing_type === 'PIX' && (
            <DropdownMenuItem onClick={handleShowPix} disabled={getPixQr.isPending}>
              {getPixQr.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <QrCode className="w-3.5 h-3.5 mr-2" />}
              Ver PIX Copia e Cola
            </DropdownMenuItem>
          )}
          {finance.asaas_pix_code && (
            <DropdownMenuItem onClick={() => copyToClipboard(finance.asaas_pix_code!)}>
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copiar PIX
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleCancel}
            disabled={cancelCharge.isPending || isPaid}
          >
            {cancelCharge.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-2" />}
            Cancelar cobrança
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* PIX Dialog */}
      <Dialog open={pixDialog} onOpenChange={setPixDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>PIX Copia e Cola</DialogTitle>
          </DialogHeader>
          {pixCode && (
            <div className="space-y-3">
              <div className="bg-muted rounded-lg p-3 text-xs break-all font-mono text-muted-foreground">
                {pixCode}
              </div>
              <Button onClick={() => copyToClipboard(pixCode)} className="w-full gap-2">
                <Copy className="w-4 h-4" />
                Copiar código PIX
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Standalone sync button for the finance page header
export function AsaasSyncButton() {
  const { data: integrations } = useIntegrations();
  const asaasConnected = integrations?.find(i => i.provider === 'asaas')?.status === 'connected';
  const sync = useAsaasSyncCharges();
  const bulk = useAsaasBulkCreateCharges();
  const importCharges = useAsaasImportCharges();

  if (!asaasConnected) return null;

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => importCharges.mutate()} disabled={importCharges.isPending} className="gap-1.5">
        {importCharges.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        Importar do Asaas
      </Button>
      <Button variant="outline" size="sm" onClick={() => bulk.mutate()} disabled={bulk.isPending} className="gap-1.5">
        {bulk.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        Criar cobranças antigas
      </Button>
      <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending} className="gap-1.5">
        {sync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        Sincronizar Asaas
      </Button>
    </div>
  );
}
