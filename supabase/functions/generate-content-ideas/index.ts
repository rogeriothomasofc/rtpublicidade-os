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

    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { platform, format, context } = await req.json() as { platform?: string; format?: string; context?: string };

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const platformText = platform && platform !== "all" ? `para ${platform}` : "para redes sociais";
    const formatText = format ? ` no formato ${format}` : "";
    const contextText = context?.trim() ? `\nContexto adicional: ${context}` : "";
    const finalPlatform = platform && platform !== "all" ? platform : "Instagram";
    const finalFormat = format ?? "Reels";

    const systemPrompt = `Você é um especialista em marketing digital e criação de conteúdo para agências de publicidade brasileiras.
Sua tarefa é gerar ideias criativas e relevantes de conteúdo para uma agência de publicidade.
Responda SOMENTE com um array JSON válido, sem markdown, sem explicações, apenas o JSON puro.`;

    const userMessage = `Gere exatamente 8 ideias de conteúdo ${platformText}${formatText} para uma agência de publicidade e tráfego pago no Brasil.${contextText}

Retorne um array JSON com este formato exato:
[
  {
    "title": "Título curto e chamativo do conteúdo",
    "description": "Breve descrição do que seria o conteúdo (1-2 frases)",
    "platform": "${finalPlatform}",
    "format": "${finalFormat}"
  }
]

As ideias devem ser variadas, práticas e focadas em demonstrar autoridade da agência, atrair clientes e gerar engajamento.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text ?? "[]";

    let ideas: { title: string; description: string; platform: string }[] = [];
    try {
      ideas = JSON.parse(raw);
    } catch {
      // Tenta extrair JSON do texto caso venha com markdown
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) ideas = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify({ ideas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-content-ideas error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", ideas: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
