import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  return { clientId: clientId || '', clientSecret: clientSecret || '' };
}

async function refreshAccessToken(refreshToken: string, supabaseAdmin: any): Promise<{ access_token: string; expires_in: number }> {
  const { clientId, clientSecret } = await getGoogleCredentials(supabaseAdmin);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  return res.json();
}

async function getValidToken(supabase: any, userId: string): Promise<string> {
  const { data: tokenData, error } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !tokenData) throw new Error('Google Calendar não conectado');

  const expiresAt = new Date(tokenData.token_expires_at);
  if (expiresAt > new Date(Date.now() + 60000)) {
    return tokenData.access_token;
  }

  // Refresh token
  const refreshed = await refreshAccessToken(tokenData.refresh_token, supabase);
  if (!refreshed.access_token) throw new Error('Falha ao renovar token');

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabase
    .from('google_calendar_tokens')
    .update({ access_token: refreshed.access_token, token_expires_at: newExpiry })
    .eq('user_id', userId);

  return refreshed.access_token;
}

async function createOrUpdateEvent(
  accessToken: string,
  calendarId: string,
  eventData: any,
  existingEventId?: string
) {
  const method = existingEventId ? 'PUT' : 'POST';
  const url = existingEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existingEventId}`
    : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });

  if (!res.ok) {
    const errBody = await res.text();
    // If event not found, create a new one
    if (res.status === 404 && existingEventId) {
      return createOrUpdateEvent(accessToken, calendarId, eventData);
    }
    throw new Error(`Google Calendar API error: ${res.status} - ${errBody}`);
  }

  return res.json();
}

async function deleteEvent(accessToken: string, calendarId: string, eventId: string) {
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function listEvents(accessToken: string, calendarId: string, timeMin: string, timeMax: string) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('Erro ao listar eventos');
  const data = await res.json();
  return data.items || [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = user.id;

    // Use service role for data operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action } = await req.json();

    // Get valid access token
    const accessToken = await getValidToken(supabase, userId);

    // Get user's calendar settings
    const { data: calTokenData } = await supabase
      .from('google_calendar_tokens')
      .select('calendar_id')
      .eq('user_id', userId)
      .maybeSingle();

    const calendarId = calTokenData?.calendar_id || 'primary';

    if (action === 'sync') {
      // Sync tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description, due_date, status, priority, type')
        .not('due_date', 'is', null);

      let synced = 0;

      for (const task of tasks || []) {
        const { data: mapping } = await supabase
          .from('calendar_event_mappings')
          .select('google_event_id')
          .eq('user_id', userId)
          .eq('entity_type', 'task')
          .eq('entity_id', task.id)
          .maybeSingle();

        const colorId = task.priority === 'Urgente' ? '11' : task.priority === 'Alta' ? '6' : task.priority === 'Média' ? '5' : '8';

        const eventData = {
          summary: `📋 ${task.title}`,
          description: `Tipo: ${task.type}\nPrioridade: ${task.priority}\nStatus: ${task.status}${task.description ? '\n\n' + task.description : ''}`,
          start: { date: task.due_date },
          end: { date: task.due_date },
          colorId,
        };

        const event = await createOrUpdateEvent(accessToken, calendarId, eventData, mapping?.google_event_id);

        await supabase
          .from('calendar_event_mappings')
          .upsert({
            user_id: userId,
            entity_type: 'task',
            entity_id: task.id,
            google_event_id: event.id,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: 'user_id,entity_type,entity_id' });

        synced++;
      }

      // Sync projects (review dates)
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, review_date, platform, budget')
        .not('review_date', 'is', null);

      for (const project of projects || []) {
        const { data: mapping } = await supabase
          .from('calendar_event_mappings')
          .select('google_event_id')
          .eq('user_id', userId)
          .eq('entity_type', 'project')
          .eq('entity_id', project.id)
          .maybeSingle();

        const eventData = {
          summary: `📊 Revisão: ${project.name}`,
          description: `Plataforma: ${project.platform}${project.budget ? '\nBudget: R$ ' + project.budget : ''}`,
          start: { date: project.review_date },
          end: { date: project.review_date },
          colorId: '3',
        };

        const event = await createOrUpdateEvent(accessToken, calendarId, eventData, mapping?.google_event_id);

        await supabase
          .from('calendar_event_mappings')
          .upsert({
            user_id: userId,
            entity_type: 'project',
            entity_id: project.id,
            google_event_id: event.id,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: 'user_id,entity_type,entity_id' });

        synced++;
      }

      // Sync finance due dates
      const { data: finances } = await supabase
        .from('finance')
        .select('id, description, due_date, amount, type, status')
        .in('status', ['Pendente', 'Atrasado']);

      for (const fin of finances || []) {
        const { data: mapping } = await supabase
          .from('calendar_event_mappings')
          .select('google_event_id')
          .eq('user_id', userId)
          .eq('entity_type', 'finance')
          .eq('entity_id', fin.id)
          .maybeSingle();

        const emoji = fin.type === 'Receita' ? '💰' : '💸';
        const eventData = {
          summary: `${emoji} ${fin.description || fin.type}: R$ ${Number(fin.amount).toFixed(2)}`,
          description: `Tipo: ${fin.type}\nStatus: ${fin.status}\nValor: R$ ${Number(fin.amount).toFixed(2)}`,
          start: { date: fin.due_date },
          end: { date: fin.due_date },
          colorId: fin.type === 'Receita' ? '10' : '11',
        };

        const event = await createOrUpdateEvent(accessToken, calendarId, eventData, mapping?.google_event_id);

        await supabase
          .from('calendar_event_mappings')
          .upsert({
            user_id: userId,
            entity_type: 'finance',
            entity_id: fin.id,
            google_event_id: event.id,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: 'user_id,entity_type,entity_id' });

        synced++;
      }

      return new Response(JSON.stringify({ success: true, synced }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      const { timeMin, timeMax } = await req.json().catch(() => ({}));
      const now = new Date();
      const min = timeMin || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const max = timeMax || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const events = await listEvents(accessToken, calendarId, min, max);

      return new Response(JSON.stringify({ events }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'status') {
      return new Response(JSON.stringify({ connected: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      await supabase.from('google_calendar_tokens').delete().eq('user_id', userId);
      await supabase.from('calendar_event_mappings').delete().eq('user_id', userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const isNotConnected = error.message?.includes('não conectado');
    return new Response(JSON.stringify({ 
      error: error.message,
      connected: false,
    }), {
      status: isNotConnected ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
