import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: aceita cron-secret ou service role key
  const cronSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") ?? "";
  const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authorized =
    (CRON_SECRET && cronSecret === CRON_SECRET) ||
    authHeader === `Bearer ${SERVICE_KEY}`;

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    SERVICE_KEY,
  );

  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
  const EVOLUTION_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
  const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

  const results: unknown[] = [];

  try {
    // 1. Busca clientes ativos com instagram e whatsapp configurados
    const { data: clients, error: clientErr } = await supabase
      .from("clients")
      .select("id, name, company, instagram_username, whatsapp_group_id")
      .eq("status", "Ativo")
      .not("instagram_username", "is", null)
      .not("whatsapp_group_id", "is", null);

    if (clientErr) throw clientErr;
    if (!clients?.length) return new Response(JSON.stringify({ message: "Nenhum cliente ativo com Instagram." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    for (const client of clients) {
      try {
        // 2. Verifica último post
        const igRes = await fetch(`${SUPABASE_URL}/functions/v1/check-instagram-last-post`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON}` },
          body: JSON.stringify({ username: client.instagram_username }),
        });
        const igData = await igRes.json();

        if (!igData.has_posts || igData.days_since_post === null) {
          results.push({ client: client.name, skipped: true, reason: "sem dados de post" });
          continue;
        }

        if (igData.days_since_post < 5) {
          results.push({ client: client.name, skipped: true, reason: `${igData.days_since_post} dias — ok` });
          continue;
        }

        // 3. Gera sugestões com Claude
        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 400,
            messages: [{
              role: "user",
              content: `Você é um consultor de marketing digital da agência RT Publicidade.\n\nCliente: ${client.company || client.name}\nInstagram: @${client.instagram_username.replace("@", "")}\nÚltima postagem: ${igData.last_post_date}\nDias sem postar: ${igData.days_since_post}\n\nGere exatamente 3 sugestões práticas de conteúdo para Instagram para esse negócio.\nFormato obrigatório:\n1️⃣ *Tema* — descrição de 1 linha do que postar\n2️⃣ *Tema* — descrição de 1 linha do que postar\n3️⃣ *Tema* — descrição de 1 linha do que postar\n\nResponda APENAS com as 3 sugestões numeradas, sem texto adicional.`,
            }],
          }),
        });
        const claudeData = await claudeRes.json();
        const suggestions = claudeData.content?.[0]?.text?.trim() ?? "";

        const whatsappMsg = `📸 *Olá, ${client.name}!*\n\nSua última postagem no Instagram foi em *${igData.last_post_date}* — já faz *${igData.days_since_post} dias* sem novidades por lá.\n\nIsso pode afetar seu alcance orgânico e fazer você perder seguidores que ainda não viraram clientes. 📉\n\nQue tal postar hoje? Aqui vão 3 ideias para você:\n\n${suggestions}\n\nQualquer dúvida, a gente te ajuda a criar! 🚀\n_RT Publicidade_`;
        const portalTitle = `📸 Sua última postagem foi há ${igData.days_since_post} dias`;
        const portalMsg = `Sua última postagem no Instagram foi em ${igData.last_post_date} — já faz ${igData.days_since_post} dias sem novidades.\n\nIsso pode afetar seu alcance orgânico. 📉\n\nSugestões de conteúdo para hoje:\n\n${suggestions}\n\nQualquer dúvida, fale com a gente! 🚀`;

        // 4. Cria aviso no portal
        await supabase.from("portal_announcements").insert({
          title: portalTitle,
          message: portalMsg,
          client_id: client.id,
          is_global: false,
          is_read: false,
        });

        // 5. Envia WhatsApp via Evolution API
        await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
          method: "POST",
          headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ number: client.whatsapp_group_id, text: whatsappMsg }),
        });

        results.push({ client: client.name, sent: true, days: igData.days_since_post });
      } catch (err) {
        results.push({ client: client.name, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
