import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface WebhookPayload {
  message: string;        // texto da mensagem (já transcrito se era áudio)
  sender_phone: string;   // ex: "5511999999999"
  sender_name: string;    // nome exibido no WhatsApp
  group_id: string;       // JID do grupo, ex: "120363XXXXXX@g.us"
}

interface ExtractedTask {
  title: string;
  description?: string;
  priority: "Baixa" | "Média" | "Alta" | "Urgente";
  type: "Campanha" | "Criativo" | "Relatório" | "Onboarding" | "Otimização" | "Outro";
  due_date?: string;      // ISO date YYYY-MM-DD
  client_name?: string;   // nome do cliente mencionado na mensagem
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Valida o secret do webhook (definido como variável de ambiente WHATSAPP_WEBHOOK_SECRET)
    const webhookSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");
    if (webhookSecret) {
      const receivedSecret = req.headers.get("x-webhook-secret");
      if (receivedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json() as WebhookPayload;
    const { message, sender_phone, sender_name, group_id } = payload;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Mensagem vazia" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valida que a mensagem veio do grupo correto
    const allowedGroupId = Deno.env.get("WHATSAPP_GROUP_JID");
    if (allowedGroupId && group_id !== allowedGroupId) {
      return new Response(JSON.stringify({ error: "Grupo não autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supabase com service role para bypassar RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Tenta encontrar o membro pelo número — opcional, usado só para atribuição
    const phoneNormalized = sender_phone.replace(/\D/g, "");
    const { data: member } = await supabase
      .from("team_members")
      .select("id, name")
      .eq("whatsapp_number", phoneNormalized)
      .eq("is_active", true)
      .maybeSingle();

    // Usa o nome do WhatsApp como fallback se número não estiver cadastrado
    const creatorName = member?.name ?? sender_name;

    // Busca lista de clientes para ajudar o Claude a identificar menções
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, company")
      .in("status", ["Ativo", "Lead"]);

    const clientList = (clients ?? [])
      .map((c) => `- ${c.name}${c.company ? ` (${c.company})` : ""}`)
      .join("\n");

    // Usa Claude para extrair os campos da tarefa
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `Você é um assistente de uma agência de publicidade brasileira.
Sua tarefa é extrair informações de uma mensagem de WhatsApp e convertê-las em uma tarefa estruturada.
Responda SOMENTE com um objeto JSON válido, sem markdown, sem explicações.

Valores válidos:
- priority: "Baixa" | "Média" | "Alta" | "Urgente"
- type: "Campanha" | "Criativo" | "Relatório" | "Onboarding" | "Otimização" | "Outro"
- due_date: formato YYYY-MM-DD (omitir se não mencionado)
- client_name: nome exato do cliente mencionado (omitir se não mencionado)

Hoje é ${today}. Interprete datas relativas como "sexta", "amanhã", "semana que vem" com base nessa data.`;

    const userMessage = `Mensagem de WhatsApp: "${message}"

Clientes cadastrados no sistema:
${clientList || "(nenhum)"}

Extraia as informações e retorne JSON neste formato:
{
  "title": "título curto e objetivo da tarefa",
  "description": "descrição opcional com mais detalhes (omitir se não houver)",
  "priority": "Média",
  "type": "Outro",
  "due_date": "YYYY-MM-DD ou omitir",
  "client_name": "nome do cliente ou omitir"
}`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Anthropic API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.content?.[0]?.text ?? "{}";

    let extracted: ExtractedTask;
    try {
      extracted = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      extracted = match ? JSON.parse(match[0]) : { title: message.slice(0, 80), priority: "Média", type: "Outro" };
    }

    // Tenta encontrar o client_id pelo nome extraído
    let clientId: string | undefined;
    if (extracted.client_name && clients?.length) {
      const nameLower = extracted.client_name.toLowerCase();
      const found = clients.find(
        (c) =>
          c.name.toLowerCase().includes(nameLower) ||
          nameLower.includes(c.name.toLowerCase()) ||
          (c.company && c.company.toLowerCase().includes(nameLower)),
      );
      clientId = found?.id;
    }

    // Cria a tarefa
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title: extracted.title,
        description: extracted.description ?? `Criada via WhatsApp por ${creatorName}`,
        status: "A Fazer",
        priority: extracted.priority ?? "Média",
        type: extracted.type ?? "Outro",
        recurrence: "Nenhuma",
        due_date: extracted.due_date ?? null,
        client_id: clientId ?? null,
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // Atribui a tarefa ao membro se o número estiver cadastrado
    if (member?.id) {
      await supabase.from("task_assignees").insert({
        task_id: task.id,
        member_id: member.id,
      });
    }

    // Monta a resposta para o grupo
    const dueDateText = extracted.due_date
      ? ` | 📅 ${new Date(extracted.due_date + "T12:00:00").toLocaleDateString("pt-BR")}`
      : "";
    const clientText = extracted.client_name ? ` | 👤 ${extracted.client_name}` : "";

    const reply =
      `✅ *Tarefa criada com sucesso!*\n\n` +
      `📋 *${task.title}*\n` +
      `🔴 Prioridade: ${task.priority} | 🏷️ ${task.type}${dueDateText}${clientText}\n` +
      `👷 Criada por: ${creatorName}\n\n` +
      `_Acesse o sistema para ver todos os detalhes._`;

    return new Response(
      JSON.stringify({ success: true, task_id: task.id, reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("whatsapp-task error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        reply: "❌ Erro ao criar tarefa. Tente novamente ou acesse o sistema diretamente.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
