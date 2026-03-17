import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, lead_id, phone, message, instance } = body;

    // Get Evolution API config from integrations table
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("config")
      .eq("provider", "evolution_api")
      .eq("status", "connected")
      .single();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: "Evolution API não configurada. Configure em Configurações > Integrações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = integration.config as { url: string; apiKey: string };
    const baseUrl = config.url.replace(/\/$/, "");
    const apiKey = config.apiKey;

    // Helper for safe fetch with connection error handling
    const safeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
      try {
        return await fetch(url, options);
      } catch (err: any) {
        if (err.message?.includes("dns error") || err.message?.includes("Name or service not known") || err.message?.includes("Connection refused") || err.message?.includes("connect error")) {
          throw new Error(`Servidor da Evolution API inacessível (${baseUrl}). Verifique se o servidor está online e se a URL nas configurações de integração está correta.`);
        }
        throw err;
      }
    };

    // Helper to get instance name
    const getInstanceName = async (instanceParam?: string) => {
      if (instanceParam) return instanceParam;
      const instancesRes = await safeFetch(`${baseUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
      });
      if (!instancesRes.ok) {
        throw new Error(`Erro ao buscar instâncias: ${instancesRes.status}`);
      }
      const instances = await instancesRes.json();
      if (!instances || instances.length === 0) {
        throw new Error("Nenhuma instância do WhatsApp encontrada");
      }
      const connected = instances.find((i: any) =>
        i.instance?.status === "open" || i.connectionStatus === "open"
      ) || instances[0];
      return connected.instance?.instanceName || connected.instanceName || connected.name;
    };

    // Helper to format phone
    const formatPhone = (p: string) => {
      let formatted = p.replace(/\D/g, "");
      if (!formatted.startsWith("55")) {
        formatted = "55" + formatted;
      }
      return formatted;
    };

    // Helper to normalize phone for matching
    const normalizePhone = (p: string) => {
      return p.replace(/\D/g, "").replace(/^55/, "");
    };

    if (action === "send") {
      const formattedPhone = formatPhone(phone);
      const instanceName = await getInstanceName(instance);

      const sendRes = await safeFetch(
        `${baseUrl}/message/sendText/${instanceName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey,
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message,
          }),
        }
      );

      const sendData = await sendRes.json();
      console.log("Evolution API send response:", JSON.stringify(sendData));

      if (!sendRes.ok) {
        throw new Error(sendData?.message || `Erro ao enviar mensagem: ${sendRes.status}`);
      }

      const { error: saveError } = await supabase.from("whatsapp_messages").insert({
        lead_id,
        phone: formattedPhone,
        direction: "sent",
        message,
        status: "sent",
        external_id: sendData?.key?.id || null,
      });

      if (saveError) {
        console.error("Error saving message:", saveError);
      }

      return new Response(
        JSON.stringify({ success: true, data: sendData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send_media") {
      const { media_url, media_type, file_name, caption } = body;
      const formattedPhone = formatPhone(phone);
      const instanceName = await getInstanceName(instance);

      let endpoint = "sendMedia";
      let mediaBody: Record<string, unknown> = {
        number: formattedPhone,
        mediatype: media_type,
        media: media_url,
        caption: caption || "",
        fileName: file_name || "file",
      };

      if (media_type === "audio") {
        endpoint = "sendWhatsAppAudio";
        mediaBody = { number: formattedPhone, audio: media_url };
      } else if (media_type === "image") {
        endpoint = "sendMedia";
        mediaBody = { number: formattedPhone, mediatype: "image", media: media_url, caption: caption || "", fileName: file_name };
      } else {
        endpoint = "sendMedia";
        mediaBody = { number: formattedPhone, mediatype: "document", media: media_url, caption: caption || "", fileName: file_name };
      }

      console.log(`Sending media via ${endpoint}:`, JSON.stringify(mediaBody));

      const sendRes = await safeFetch(
        `${baseUrl}/message/${endpoint}/${instanceName}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: apiKey },
          body: JSON.stringify(mediaBody),
        }
      );

      const sendData = await sendRes.json();
      console.log("Evolution API media response:", JSON.stringify(sendData));

      if (!sendRes.ok) {
        throw new Error(sendData?.message || `Erro ao enviar mídia: ${sendRes.status}`);
      }

      const displayMessage = media_type === "audio" ? "🎤 Áudio" : media_type === "image" ? "📷 Imagem" : `📎 ${file_name || "Arquivo"}`;

      const { error: saveError } = await supabase.from("whatsapp_messages").insert({
        lead_id,
        phone: formattedPhone,
        direction: "sent",
        message: caption || displayMessage,
        status: "sent",
        external_id: sendData?.key?.id || null,
        media_type,
        media_url,
      });

      if (saveError) console.error("Error saving media message:", saveError);

      return new Response(
        JSON.stringify({ success: true, data: sendData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "history") {
      const { data: messages, error: msgError } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("lead_id", lead_id)
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;

      return new Response(
        JSON.stringify({ messages: messages || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "instances") {
      const instancesRes = await safeFetch(`${baseUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
      });

      if (!instancesRes.ok) {
        throw new Error(`Erro ao buscar instâncias: ${instancesRes.status}`);
      }

      const instances = await instancesRes.json();
      return new Response(
        JSON.stringify({ instances }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== FETCH LABELS ==========
    if (action === "fetch_labels") {
      const instanceName = await getInstanceName(instance);

      const labelsRes = await safeFetch(`${baseUrl}/label/findLabels/${instanceName}`, {
        headers: { apikey: apiKey },
      });

      if (!labelsRes.ok) {
        const errText = await labelsRes.text();
        console.error("Error fetching labels:", errText);
        throw new Error(`Erro ao buscar etiquetas: ${labelsRes.status}`);
      }

      const labels = await labelsRes.json();
      console.log("Labels from Evolution API:", JSON.stringify(labels));

      // Upsert labels into database
      for (const label of labels || []) {
        const labelId = label.id || label.labelId || String(label.name);
        const labelName = label.name || label.displayName || "Sem nome";
        const labelColor = label.color || label.hexColor || null;

        const { error: upsertError } = await supabase
          .from("whatsapp_labels")
          .upsert(
            { label_id: labelId, name: labelName, color: labelColor },
            { onConflict: "label_id" }
          );

        if (upsertError) console.error("Error upserting label:", upsertError);
      }

      // Return stored labels
      const { data: storedLabels } = await supabase
        .from("whatsapp_labels")
        .select("*")
        .order("name");

      return new Response(
        JSON.stringify({ labels: storedLabels || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== SYNC CHATS (fetch history from WhatsApp) ==========
    if (action === "sync_chats") {
      const instanceName = await getInstanceName(instance);

      // 1. Fetch all chats from Evolution API
      const chatsRes = await safeFetch(`${baseUrl}/chat/findChats/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({}),
      });

      if (!chatsRes.ok) {
        const errText = await chatsRes.text();
        console.error("Error fetching chats:", errText);
        throw new Error(`Erro ao buscar chats: ${chatsRes.status}`);
      }

      const chats = await chatsRes.json();
      console.log(`Found ${chats?.length || 0} chats from Evolution API`);

      // Get existing leads
      const { data: existingLeads } = await supabase
        .from("sales_pipeline")
        .select("id, phone, lead_name");

      const leadsByPhone: Record<string, any> = {};
      for (const lead of existingLeads || []) {
        if (lead.phone) {
          leadsByPhone[normalizePhone(lead.phone)] = lead;
        }
      }

      let synced = 0;
      let newLeads = 0;

      // Process each chat
      for (const chat of chats || []) {
        const remoteJid = chat.id || chat.remoteJid;
        if (!remoteJid || remoteJid.includes("@g.us") || remoteJid === "status@broadcast") continue;

        const chatPhone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
        const normalizedPhone = normalizePhone(chatPhone);
        const contactName = chat.name || chat.pushName || chat.contact?.pushName || chatPhone;

        // Fetch profile picture
        let avatarUrl: string | null = null;
        try {
          const picRes = await safeFetch(`${baseUrl}/chat/fetchProfilePictureUrl/${instanceName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: apiKey },
            body: JSON.stringify({ number: remoteJid }),
          });
          if (picRes.ok) {
            const picData = await picRes.json();
            avatarUrl = picData?.profilePictureUrl || picData?.picture || null;
          }
        } catch (e) {
          console.error(`Error fetching profile pic for ${chatPhone}:`, e);
        }

        // Find or create lead
        let lead = leadsByPhone[normalizedPhone];
        if (!lead) {
          const { data: newLead, error: createError } = await supabase
            .from("sales_pipeline")
            .insert({
              lead_name: contactName,
              phone: chatPhone,
              stage: "New",
              deal_value: 0,
              probability: 10,
              duration_months: 12,
              avatar_url: avatarUrl,
              source: "whatsapp_sync",
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating lead:", createError);
            continue;
          }

          lead = newLead;
          leadsByPhone[normalizedPhone] = lead;
          newLeads++;
        } else if (avatarUrl && !lead.avatar_url) {
          // Update existing lead with avatar
          await supabase
            .from("sales_pipeline")
            .update({ avatar_url: avatarUrl })
            .eq("id", lead.id);
        }

        // Fetch messages for this chat
        try {
          const messagesRes = await safeFetch(`${baseUrl}/chat/findMessages/${instanceName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: apiKey },
            body: JSON.stringify({
              where: { key: { remoteJid } },
              limit: 50,
            }),
          });

          if (!messagesRes.ok) {
            console.error(`Error fetching messages for ${remoteJid}: ${messagesRes.status}`);
            continue;
          }

          const messagesData = await messagesRes.json();
          let messages: any[] = [];
          if (Array.isArray(messagesData)) {
            messages = messagesData;
          } else if (messagesData?.messages) {
            if (Array.isArray(messagesData.messages)) {
              messages = messagesData.messages;
            } else if (messagesData.messages?.records && Array.isArray(messagesData.messages.records)) {
              messages = messagesData.messages.records;
            }
          } else if (messagesData?.records && Array.isArray(messagesData.records)) {
            messages = messagesData.records;
          }

          for (const msg of messages) {
            const externalId = msg.key?.id || msg.id;
            if (!externalId) continue;

            // Check if message already exists
            const { data: existing } = await supabase
              .from("whatsapp_messages")
              .select("id")
              .eq("external_id", externalId)
              .maybeSingle();

            if (existing) continue;

            const direction = msg.key?.fromMe ? "sent" : "received";
            const msgText = msg.message?.conversation
              || msg.message?.extendedTextMessage?.text
              || msg.message?.imageMessage?.caption
              || msg.message?.documentMessage?.caption
              || (msg.message?.audioMessage ? "🎤 Áudio" : "")
              || (msg.message?.imageMessage ? "📷 Imagem" : "")
              || (msg.message?.documentMessage ? `📎 ${msg.message.documentMessage.fileName || "Arquivo"}` : "")
              || (msg.message?.videoMessage ? "🎥 Vídeo" : "")
              || (msg.message?.stickerMessage ? "🏷️ Sticker" : "")
              || "";

            if (!msgText) continue;

            let mediaType = null;
            if (msg.message?.audioMessage) mediaType = "audio";
            else if (msg.message?.imageMessage) mediaType = "image";
            else if (msg.message?.documentMessage) mediaType = "document";
            else if (msg.message?.videoMessage) mediaType = "video";

            const createdAt = msg.messageTimestamp
              ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
              : new Date().toISOString();

            const { error: insertError } = await supabase
              .from("whatsapp_messages")
              .insert({
                lead_id: lead.id,
                phone: chatPhone,
                direction,
                message: msgText,
                status: direction === "sent" ? "sent" : "received",
                external_id: externalId,
                media_type: mediaType,
                created_at: createdAt,
              });

            if (insertError) {
              console.error("Error inserting message:", insertError);
            } else {
              synced++;
            }
          }
        } catch (e) {
          console.error(`Error syncing messages for ${remoteJid}:`, e);
        }
      }

      // Also sync labels for contacts
      try {
        const labelsRes = await safeFetch(`${baseUrl}/label/findLabels/${instanceName}`, {
          headers: { apikey: apiKey },
        });
        if (labelsRes.ok) {
          const labels = await labelsRes.json();
          for (const label of labels || []) {
            const labelId = label.id || label.labelId || String(label.name);
            await supabase
              .from("whatsapp_labels")
              .upsert(
                { label_id: labelId, name: label.name || "Sem nome", color: label.color || label.hexColor || null },
                { onConflict: "label_id" }
              );
          }
        }
      } catch (e) {
        console.error("Error syncing labels:", e);
      }

      return new Response(
        JSON.stringify({ success: true, synced, newLeads, totalChats: chats?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== SYNC SINGLE CONTACT ==========
    if (action === "sync_contact") {
      if (!lead_id || !phone) {
        return new Response(
          JSON.stringify({ error: "lead_id e phone são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const instanceName = await getInstanceName(instance);
      const formattedPhone = formatPhone(phone);
      const remoteJid = `${formattedPhone}@s.whatsapp.net`;

      // Fetch profile picture
      let avatarUrl: string | null = null;
      try {
        const picRes = await safeFetch(`${baseUrl}/chat/fetchProfilePictureUrl/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: apiKey },
          body: JSON.stringify({ number: remoteJid }),
        });
        if (picRes.ok) {
          const picData = await picRes.json();
          avatarUrl = picData?.profilePictureUrl || picData?.picture || null;
        }
      } catch (e) {
        console.error(`Error fetching profile pic:`, e);
      }

      // Update avatar if found
      if (avatarUrl) {
        await supabase.from("sales_pipeline").update({ avatar_url: avatarUrl }).eq("id", lead_id);
      }

      // Fetch messages
      let synced = 0;
      try {
        const messagesRes = await safeFetch(`${baseUrl}/chat/findMessages/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: apiKey },
          body: JSON.stringify({ where: { key: { remoteJid } }, limit: 100 }),
        });

        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          let messages: any[] = [];
          if (Array.isArray(messagesData)) {
            messages = messagesData;
          } else if (messagesData?.messages) {
            if (Array.isArray(messagesData.messages)) {
              messages = messagesData.messages;
            } else if (messagesData.messages?.records && Array.isArray(messagesData.messages.records)) {
              messages = messagesData.messages.records;
            }
          } else if (messagesData?.records && Array.isArray(messagesData.records)) {
            messages = messagesData.records;
          }

          for (const msg of messages) {
            const externalId = msg.key?.id || msg.id;
            if (!externalId) continue;

            const { data: existing } = await supabase
              .from("whatsapp_messages")
              .select("id")
              .eq("external_id", externalId)
              .maybeSingle();

            if (existing) continue;

            const direction = msg.key?.fromMe ? "sent" : "received";
            const msgText = msg.message?.conversation
              || msg.message?.extendedTextMessage?.text
              || msg.message?.imageMessage?.caption
              || msg.message?.documentMessage?.caption
              || (msg.message?.audioMessage ? "🎤 Áudio" : "")
              || (msg.message?.imageMessage ? "📷 Imagem" : "")
              || (msg.message?.documentMessage ? `📎 ${msg.message.documentMessage.fileName || "Arquivo"}` : "")
              || (msg.message?.videoMessage ? "🎥 Vídeo" : "")
              || (msg.message?.stickerMessage ? "🏷️ Sticker" : "")
              || "";

            if (!msgText) continue;

            let mediaType = null;
            if (msg.message?.audioMessage) mediaType = "audio";
            else if (msg.message?.imageMessage) mediaType = "image";
            else if (msg.message?.documentMessage) mediaType = "document";
            else if (msg.message?.videoMessage) mediaType = "video";

            const createdAt = msg.messageTimestamp
              ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
              : new Date().toISOString();

            const { error: insertError } = await supabase
              .from("whatsapp_messages")
              .insert({
                lead_id,
                phone: formattedPhone,
                direction,
                message: msgText,
                status: direction === "sent" ? "sent" : "received",
                external_id: externalId,
                media_type: mediaType,
                created_at: createdAt,
              });

            if (!insertError) synced++;
          }
        }
      } catch (e) {
        console.error(`Error syncing messages for contact:`, e);
      }

      return new Response(
        JSON.stringify({ success: true, synced, avatarUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CHECK WEBHOOK ==========
    if (action === "check_webhook") {
      const instanceName = await getInstanceName(instance);

      const res = await safeFetch(`${baseUrl}/webhook/find/${instanceName}`, {
        headers: { apikey: apiKey },
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({ error: `Erro ao buscar webhook: ${res.status}`, details: errText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const webhookData = await res.json();
      return new Response(
        JSON.stringify({ webhook: webhookData, instanceName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== SET WEBHOOK ==========
    if (action === "set_webhook") {
      const instanceName = await getInstanceName(instance);
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

      const webhookPayload = {
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "CONNECTION_UPDATE",
        ],
      };

      console.log(`Setting webhook for ${instanceName}:`, JSON.stringify(webhookPayload));

      const res = await safeFetch(`${baseUrl}/webhook/set/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify(webhookPayload),
      });

      const data = await res.json();
      console.log("Webhook set response:", JSON.stringify(data));

      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `Erro ao configurar webhook: ${res.status}`, details: data }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, webhook: data, instanceName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("whatsapp-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
