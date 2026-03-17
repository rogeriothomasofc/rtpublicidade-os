import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function getGoogleCredentials(supabaseAdmin: any) {
  const { data } = await supabaseAdmin
    .from('integrations')
    .select('config')
    .eq('provider', 'google_calendar')
    .eq('status', 'connected')
    .maybeSingle();

  const config = data?.config as Record<string, unknown> | null;
  const clientId = (config?.client_id as string) || Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = (config?.client_secret as string) || Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Google Calendar não configuradas.');
  }

  return { clientId, clientSecret };
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(redirectHtml('Erro na autorização: ' + error, false), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!code || !stateParam) {
      return new Response(redirectHtml('Parâmetros inválidos', false), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const { userId } = JSON.parse(atob(stateParam));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { clientId, clientSecret } = await getGoogleCredentials(supabase);
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new Response(redirectHtml('Erro ao obter token: ' + tokenData.error_description, false), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
      }, { onConflict: 'user_id' });

    if (upsertError) {
      return new Response(redirectHtml('Erro ao salvar tokens: ' + upsertError.message, false), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response(redirectHtml('Google Calendar conectado com sucesso!', true), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    return new Response(redirectHtml('Erro interno: ' + error.message, false), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
});

function redirectHtml(message: string, success: boolean) {
  return `<!DOCTYPE html>
<html>
<head><title>Google Calendar</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0a0a0a;color:#fff;">
  <div style="text-align:center;max-width:400px;">
    <h2 style="color:${success ? '#22c55e' : '#ef4444'}">${success ? '✅' : '❌'} ${message}</h2>
    <p>Esta janela será fechada automaticamente...</p>
    <script>setTimeout(() => window.close(), 2000);</script>
  </div>
</body>
</html>`;
}
