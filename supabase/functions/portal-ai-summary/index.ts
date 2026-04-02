import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { clientId, clientName, tasks, finance, planning } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `Você é o gestor de conta de uma agência de marketing digital e tráfego pago.
Seu trabalho é gerar um relatório semanal DETALHADO e estratégico para o CLIENTE, mostrando TODO o trabalho realizado NESTA SEMANA (segunda a domingo).
O relatório deve ser atualizado e refletir o estado atual das atividades.
O objetivo é fazer o cliente SENTIR que a equipe está trabalhando duro e dedicada ao projeto dele.

Regras:
- Português brasileiro, tom profissional, confiante e proativo
- Mínimo 6-8 linhas, máximo 12 linhas
- Use parágrafos curtos e organizados
- Comece com uma saudação breve e direta
- Detalhe CADA tarefa concluída explicando o impacto/benefício para o cliente
- Tarefas em andamento: mostre progresso e próximos passos
- Se houver tarefas atrasadas, explique que estão sendo priorizadas (nunca culpar o cliente)
- Financeiro: mencione valores pagos, pendentes e próximos vencimentos de forma transparente
- Planejamentos/Campanhas: destaque estratégias em andamento e resultados esperados
- Finalize com uma frase motivadora sobre os próximos passos
- Use no máximo 2-3 emojis estratégicos (✅, 📊, 🚀)
- Se nada relevante aconteceu, ainda assim demonstre que a equipe está monitorando e planejando
- NUNCA diga "nada aconteceu" — sempre mostre valor e acompanhamento`;

    const userMessage = `Gere um relatório semanal detalhado para o cliente "${clientName}".
Mostre todo o trabalho realizado NESTA SEMANA e transmita dedicação ao projeto.

Tarefas desta semana (detalhe cada uma):
${JSON.stringify(tasks, null, 2)}

Movimentações financeiras recentes:
${JSON.stringify(finance, null, 2)}

Planejamentos e campanhas atualizados:
${JSON.stringify(planning, null, 2)}

Gere um relatório completo e estratégico que faça o cliente se sentir valorizado.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 800 },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar o resumo.";

    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Portal AI summary error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", summary: null }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
