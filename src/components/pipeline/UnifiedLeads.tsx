import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Loader2, Users, Stethoscope } from 'lucide-react';
import {
  useCrossedLeads,
  type CrossedLead,
} from '@/hooks/useCrossedLeads';
import { useUpdateGmbLead, analyzeGmbLead } from '@/hooks/useGmbLeads';
import { AddProspectForm } from '@/components/pipeline/InstagramProspecting';
import { LeadDetailModal } from './LeadDetailModal';
import { LeadCard } from './LeadCard';

//─── Auto-analisar leads GMB novos em background ──────────────────────────────
function useAutoAnalyzeGmbLeads(leads: CrossedLead[] | undefined) {
  const updateGmb = useUpdateGmbLead();
  const analyzingRef = useRef(false);

  useEffect(() => {
    if (!leads || analyzingRef.current) return;
    const pending = leads.filter(l => l.gmb_lead && !l.gmb_lead.ai_messages?.length);
    if (!pending.length) return;

    async function runNext(queue: CrossedLead[]) {
      for (const item of queue) {
        if (!item.gmb_lead) continue;
        analyzingRef.current = true;
        try {
          const igData = item.instagram_prospect ? {
            username: item.instagram_prospect.username,
            bio: item.instagram_prospect.bio,
            followers_count: item.instagram_prospect.followers_count,
            niche: item.instagram_prospect.niche,
          } : null;
          const result = await analyzeGmbLead(item.gmb_lead, igData);
          updateGmb.mutate({
            id: item.gmb_lead.id,
            ai_diagnosis: result.diagnosis,
            ai_messages: result.messages,
            website_issues: result.website_issues,
          });
        } catch (e) {
          console.error(`Auto-análise falhou para ${item.gmb_lead.nome_empresa}:`, e);
        }
      }
      analyzingRef.current = false;
    }

    runNext(pending);
  }, [leads?.length]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Página unificada de Leads ─────────────────────────────────────────────────
export function UnifiedLeads() {
  const { data: leads, isLoading, matchedCount } = useCrossedLeads();
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<CrossedLead | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useAutoAnalyzeGmbLeads(leads);

  const filtered = (leads || []).filter(l => {
    // Ocultar leads que já foram movidos para o Pipeline ou que já receberam mensagem
    if (l.instagram_prospect?.pipeline_lead_id || l.gmb_lead?.pipeline_lead_id) return false;
    if (l.instagram_prospect && l.instagram_prospect.status !== 'Identificado') return false;
    if (l.gmb_lead && l.gmb_lead.status !== 'Novo') return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.lead_name.toLowerCase().includes(q) ||
      (l.instagram_prospect?.username || '').toLowerCase().includes(q) ||
      (l.gmb_lead?.endereco || '').toLowerCase().includes(q) ||
      (l.instagram_prospect?.niche || '').toLowerCase().includes(q) ||
      (l.gmb_lead?.especialidades || '').toLowerCase().includes(q)
    );
  });

  const total = leads?.length ?? 0;


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" /> Leads
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} lead{total !== 1 ? 's' : ''} — {matchedCount} unificado{matchedCount !== 1 ? 's' : ''} (mesmo negócio em ambas as fontes)
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4" /> Novo Diagnóstico Instagram
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 h-8 text-sm"
          placeholder="Buscar por nome, @username, endereço ou nicho..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando leads...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-sm">Nenhum lead encontrado</p>
          <p className="text-xs mt-1">
            {total === 0
              ? 'Adicione um diagnóstico Instagram ou importe leads do Google Maps via n8n'
              : 'Nenhum lead para este filtro'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(lead => (
            <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
          ))}
        </div>
      )}

      {/* Modal detalhes */}
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}

      {/* Dialog: Novo Diagnóstico Instagram */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                <Stethoscope className="w-3.5 h-3.5 text-white" />
              </div>
              Novo Diagnóstico Digital
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Informe o @ e o site. A IA vai analisar Instagram + site + Google e gerar um diagnóstico completo com mensagem personalizada.
          </p>
          <AddProspectForm onClose={() => setShowAddDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
