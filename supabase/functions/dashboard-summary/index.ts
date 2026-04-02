import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DashboardStats {
  overdueTasks: number;
  pausedClients: number;
  overdueInvoicesAmount: number;
  hotLeads: number;
  revenueInPeriod: number;
  activeClients: number;
  leadsWon: number;
  pipelineValue: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { stats } = await req.json() as { stats: DashboardStats };
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `Você é um assistente executivo de uma agência de tráfego pago.
Seu trabalho é analisar métricas do dashboard e gerar um resumo conciso e acionável em português brasileiro.
O resumo deve ter no máximo 3-4 linhas e destacar:
- Problemas urgentes (tarefas atrasadas, faturas vencidas)
- Oportunidades (leads quentes, vendas em andamento)
- Prioridades do dia
Use linguagem direta e profissional. Inclua valores monetários quando relevante.
Não use emojis. Seja objetivo.`;

    const userMessage = `Analise estas métricas do dashboard de hoje e gere um resumo executivo:

- Tarefas atrasadas: ${stats.overdueTasks}
- Clientes pausados: ${stats.pausedClients}
- Faturas vencidas: R$ ${stats.overdueInvoicesAmount.toLocaleString('pt-BR')}
- Leads em Proposal (quentes): ${stats.hotLeads}
- Receita no período: R$ ${stats.revenueInPeriod.toLocaleString('pt-BR')}
- Clientes ativos novos: ${stats.activeClients}
- Leads ganhos: ${stats.leadsWon}
- Pipeline ativo: R$ ${stats.pipelineValue.toLocaleString('pt-BR')}

Gere um parágrafo curto com as prioridades e insights principais.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar o resumo.";

    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", summary: null }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
