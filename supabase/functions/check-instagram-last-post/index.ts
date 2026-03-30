import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Método 1: Business Discovery API (oficial) — retorna timestamp da última postagem
async function fetchLastPostViaBusinessDiscovery(
  username: string,
  accessToken: string,
  igUserId: string
): Promise<string | null> {
  if (!accessToken || !igUserId) return null;
  try {
    const url = `https://graph.facebook.com/v20.0/${igUserId}?fields=business_discovery.fields(media.limit(1){timestamp})&username=${encodeURIComponent(username)}&access_token=${accessToken}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.business_discovery?.media?.data?.[0]?.timestamp ?? null;
  } catch { return null; }
}

// Método 2: Web API não oficial — fallback quando conta não é Business
async function fetchLastPostViaWebApi(username: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "x-ig-app-id": "936619743392459",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "Referer": "https://www.instagram.com/",
        },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const takenAt = json?.data?.user?.edge_owner_to_timeline_media?.edges?.[0]?.node?.taken_at_timestamp;
    if (!takenAt) return null;
    // taken_at_timestamp é Unix (segundos) — converter para ISO
    return new Date(takenAt * 1000).toISOString();
  } catch { return null; }
}

function calcularDias(isoTimestamp: string): number {
  const lastPost = new Date(isoTimestamp);
  const hoje = new Date();
  return Math.floor((hoje.getTime() - lastPost.getTime()) / (1000 * 60 * 60 * 24));
}

function formatarDataBR(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ error: "username é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanUsername = username.replace("@", "").trim();

    const INSTAGRAM_ACCESS_TOKEN = Deno.env.get("INSTAGRAM_ACCESS_TOKEN") ?? "";
    const INSTAGRAM_USER_ID = Deno.env.get("INSTAGRAM_USER_ID") ?? "";

    // Tenta Business Discovery primeiro, depois fallback web
    const lastPostTimestamp =
      await fetchLastPostViaBusinessDiscovery(cleanUsername, INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID)
      ?? await fetchLastPostViaWebApi(cleanUsername);

    if (!lastPostTimestamp) {
      return new Response(
        JSON.stringify({
          username: cleanUsername,
          has_posts: false,
          days_since_post: null,
          last_post_date: null,
          message: "Não foi possível obter dados. Conta pode ser privada ou pessoal.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const days = calcularDias(lastPostTimestamp);
    const dataBR = formatarDataBR(lastPostTimestamp);

    return new Response(
      JSON.stringify({
        username: cleanUsername,
        has_posts: true,
        days_since_post: days,
        last_post_date: dataBR,
        last_post_iso: lastPostTimestamp,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
