/**
 * useAutoGenerateCadences
 *
 * Roda em background quando o Pipeline carrega.
 * Encontra todos os leads que já têm diagnóstico mas ainda não têm
 * cadência e gera automaticamente, um por vez.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLeadsWithoutCadence, generateLeadCadence } from './useCrossedLeads';
import { useQueryClient } from '@tanstack/react-query';

export function useAutoGenerateCadences() {
  const { ig, gmb, isLoading } = useLeadsWithoutCadence();
  const runningRef = useRef(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (isLoading || runningRef.current) return;
    if (!ig.length && !gmb.length) return;

    runningRef.current = true;

    async function run() {
      // Leads do Instagram sem cadência
      for (const prospect of ig) {
        try {
          const result = await generateLeadCadence({
            id: `ig_${prospect.id}`,
            instagram_prospect: prospect,
            gmb_lead: null,
            website: (prospect.website ?? '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
            lead_name: prospect.full_name ?? prospect.username,
            phone: prospect.whatsapp ?? null,
            email: prospect.email ?? null,
            heat_score: 50,
            instagram_score: 0,
            gmb_score: 0,
          });
          await supabase.from('lead_cadence' as any).insert({
            instagram_prospect_id: prospect.id,
            gmb_lead_id: null,
            lead_name: prospect.full_name ?? prospect.username,
            company: prospect.full_name ?? null,
            website: prospect.website ?? null,
            phone: prospect.whatsapp ?? null,
            email: prospect.email ?? null,
            heat_score: 50,
            instagram_score: 0,
            gmb_score: 0,
            ai_unified_analysis: result.analysis,
            cadence_steps: result.cadence_steps,
            status: 'active',
            current_step: 0,
            started_at: null,
          });
          qc.invalidateQueries({ queryKey: ['lead_cadence'] });
        } catch (e) {
          console.error(`Auto-cadência Instagram falhou (${prospect.username}):`, e);
        }
      }

      // Leads do GMB sem cadência
      for (const lead of gmb) {
        try {
          const result = await generateLeadCadence({
            id: `gmb_${lead.id}`,
            instagram_prospect: null,
            gmb_lead: lead,
            website: (lead.website ?? '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
            lead_name: lead.nome_empresa,
            phone: lead.telefone ?? lead.whatsapp_jid ?? null,
            email: null,
            heat_score: 50,
            instagram_score: 0,
            gmb_score: 0,
          });
          await supabase.from('lead_cadence' as any).insert({
            instagram_prospect_id: null,
            gmb_lead_id: lead.id,
            lead_name: lead.nome_empresa,
            company: lead.nome_empresa,
            website: lead.website ?? null,
            phone: lead.telefone ?? lead.whatsapp_jid ?? null,
            email: null,
            heat_score: 50,
            instagram_score: 0,
            gmb_score: 0,
            ai_unified_analysis: result.analysis,
            cadence_steps: result.cadence_steps,
            status: 'active',
            current_step: 0,
            started_at: null,
          });
          qc.invalidateQueries({ queryKey: ['lead_cadence'] });
        } catch (e) {
          console.error(`Auto-cadência GMB falhou (${lead.nome_empresa}):`, e);
        }
      }

      runningRef.current = false;
    }

    run();
  }, [isLoading, ig.length, gmb.length]); // eslint-disable-line react-hooks/exhaustive-deps
}
