import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalize Brazilian phone: strip country code 55, add 9th digit if missing for mobile
const normalizeBrazilianPhone = (p: string): string => {
  let digits = p.replace(/\D/g, "");
  // Remove country code 55
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  // Brazilian mobile: DDD (2 digits) + 9 + 8 digits = 11 digits total
  // If we have 10 digits (DDD + 8 digits), insert the 9 after DDD
  if (digits.length === 10) {
    digits = digits.slice(0, 2) + "9" + digits.slice(2);
  }
  return digits;
};

const findLeadByPhone = (leads: any[], phone: string): string | null => {
  const incomingNorm = normalizeBrazilianPhone(phone);
  for (const lead of leads) {
    if (!lead.phone) continue;
    if (normalizeBrazilianPhone(lead.phone) === incomingNorm) return lead.id;
  }
  return null;
};

const fetchContactName = async (
  baseUrl: string, apiKey: string, instanceName: string, phone: string
): Promise<string | null> => {
  try {
    const jid = `${phone}@s.whatsapp.net`;
    const res = await fetch(`${baseUrl}/chat/findContacts/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ where: { id: jid } }),
    });
    if (res.ok) {
      const contacts = await res.json();
      if (Array.isArray(contacts) && contacts.length > 0) {
        const c = contacts[0];
        return c.pushName || c.name || c.verifiedName || c.notify || null;
      }
    }
  } catch (e) {
    console.error("Error fetching contact name:", e);
  }
  return null;
};

const getEvolutionConfig = async (supabase: any) => {
  const { data: integration } = await supabase
    .from("integrations")
    .select("config")
    .eq("provider", "evolution_api")
    .eq("status", "connected")
    .single();
  if (!integration) return null;
  const config = integration.config as { url: string; apiKey: string };
  return { baseUrl: config.url.replace(/\/$/, ""), apiKey: config.apiKey };
};

const getInstanceName = async (baseUrl: string, apiKey: string): Promise<string | null> => {
  try {
    const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
      headers: { apikey: apiKey },
    });
    if (!res.ok) return null;
    const instances = await res.json();
    if (!instances?.length) return null;
    const connected = instances.find((i: any) =>
      i.instance?.status === "open" || i.connectionStatus === "open"
    ) || instances[0];
    return connected.instance?.instanceName || connected.instanceName || connected.name;
  } catch {
    return null;
  }
};

// Detect media type and extract info from the message object
interface MediaInfo {
  mediaType: "audio" | "image" | "video" | "document";
  mimeType: string;
  fileName: string;
  base64?: string;
  mediaUrl?: string;
  mediaKey?: string;
  messageType: string;
}

const extractMediaInfo = (msg: any): MediaInfo | null => {
  if (msg.audioMessage) {
    return {
      mediaType: "audio",
      mimeType: msg.audioMessage.mimetype || "audio/ogg",
      fileName: `audio_${Date.now()}.ogg`,
      base64: msg.audioMessage.base64 || msg.base64,
      mediaUrl: msg.audioMessage.url || msg.audioMessage.mediaUrl,
      mediaKey: msg.audioMessage.mediaKey,
      messageType: "audioMessage",
    };
  }
  if (msg.imageMessage) {
    const ext = (msg.imageMessage.mimetype || "image/jpeg").split("/")[1] || "jpg";
    return {
      mediaType: "image",
      mimeType: msg.imageMessage.mimetype || "image/jpeg",
      fileName: `image_${Date.now()}.${ext}`,
      base64: msg.imageMessage.base64 || msg.base64,
      mediaUrl: msg.imageMessage.url || msg.imageMessage.mediaUrl,
      mediaKey: msg.imageMessage.mediaKey,
      messageType: "imageMessage",
    };
  }
  if (msg.videoMessage) {
    return {
      mediaType: "video",
      mimeType: msg.videoMessage.mimetype || "video/mp4",
      fileName: `video_${Date.now()}.mp4`,
      base64: msg.videoMessage.base64 || msg.base64,
      mediaUrl: msg.videoMessage.url || msg.videoMessage.mediaUrl,
      mediaKey: msg.videoMessage.mediaKey,
      messageType: "videoMessage",
    };
  }
  if (msg.documentMessage) {
    const docName = msg.documentMessage.fileName || `document_${Date.now()}`;
    return {
      mediaType: "document",
      mimeType: msg.documentMessage.mimetype || "application/octet-stream",
      fileName: docName,
      base64: msg.documentMessage.base64 || msg.base64,
      mediaUrl: msg.documentMessage.url || msg.documentMessage.mediaUrl,
      mediaKey: msg.documentMessage.mediaKey,
      messageType: "documentMessage",
    };
  }
  return null;
};

// Download media from Evolution API using getBase64FromMediaMessage endpoint
const downloadMediaFromEvolution = async (
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  messageData: any
): Promise<{ base64: string; mimeType: string } | null> => {
  try {
    // Try getBase64FromMediaMessage endpoint (Evolution API v2)
    const res = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({
        message: {
          key: messageData.key,
          message: messageData.message,
        },
        convertToMp4: false,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.base64) {
        return { base64: data.base64, mimeType: data.mimetype || data.mimeType || "application/octet-stream" };
      }
    }
    console.log("getBase64FromMediaMessage failed or returned no data, status:", res.status);
  } catch (e) {
    console.error("Error downloading media from Evolution:", e);
  }
  return null;
};

// Convert base64 to Uint8Array in chunks to avoid stack overflow
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
};

// Upload media to Supabase Storage and return public URL
const uploadMediaToStorage = async (
  supabase: any,
  leadId: string | null,
  base64Data: string,
  fileName: string,
  mimeType: string
): Promise<string | null> => {
  try {
    const bytes = base64ToUint8Array(base64Data);
    const folder = leadId || "unknown";
    const filePath = `${folder}/${Date.now()}_${fileName}`;

    const { error } = await supabase.storage
      .from("whatsapp-media")
      .upload(filePath, bytes, {
        contentType: mimeType,
        cacheControl: "3600",
      });

    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage.from("whatsapp-media").getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (e) {
    console.error("Error uploading media to storage:", e);
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload).slice(0, 500));

    const event = payload.event || payload.type;

    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      const messageData = payload.data || payload;
      const key = messageData.key || {};
      const isFromMe = !!key.fromMe;
      const direction = isFromMe ? "sent" : "received";

      const remoteJid = key.remoteJid || "";
      const rawPhone = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");

      if (!rawPhone || remoteJid.includes("@g.us") || remoteJid.includes("@lid")) {
        console.log("Skipping group message, lid contact, or empty phone");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const phone = normalizeBrazilianPhone(rawPhone);

      // Extract message content
      const msg = messageData.message || {};
      const mediaInfo = extractMediaInfo(msg);

      const text =
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.documentMessage?.caption ||
        (msg.audioMessage ? "🎤 Áudio" : null) ||
        (msg.imageMessage ? "📷 Imagem" : null) ||
        (msg.videoMessage ? "🎥 Vídeo" : null) ||
        (msg.documentMessage ? `📎 ${msg.documentMessage?.fileName || "Arquivo"}` : null) ||
        (msg.stickerMessage ? "🏷️ Sticker" : null) ||
        null;

      if (!text && !mediaInfo) {
        console.log("No text or media content in message, skipping");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const externalId = key.id || null;

      // Find lead
      const { data: leads } = await supabase
        .from("sales_pipeline")
        .select("id, phone")
        .not("phone", "is", null);

      let matchedLeadId = findLeadByPhone(leads || [], phone);

      if (!matchedLeadId) {
        let contactName: string | null = null;
        if (!isFromMe) {
          contactName = messageData.pushName || messageData.verifiedBizName || null;
        }

        if (!contactName) {
          const evoConfig = await getEvolutionConfig(supabase);
          if (evoConfig) {
            const instanceName = await getInstanceName(evoConfig.baseUrl, evoConfig.apiKey);
            if (instanceName) {
              const apiName = await fetchContactName(
                evoConfig.baseUrl, evoConfig.apiKey, instanceName, phone
              );
              if (apiName) contactName = apiName;
            }
          }
        }

        if (!contactName) contactName = phone;

        console.log(`No lead found for ${phone}, creating new lead: ${contactName}`);

        const { data: newLead, error: createError } = await supabase
          .from("sales_pipeline")
          .insert({
            lead_name: contactName,
            phone,
            stage: "New",
            deal_value: 0,
            probability: 10,
            duration_months: 12,
            source: isFromMe ? "whatsapp_sent" : "whatsapp_incoming",
          })
          .select("id")
          .single();

        if (createError) {
          console.error("Error creating lead:", createError);
        } else {
          matchedLeadId = newLead.id;
          console.log(`New lead created: ${newLead.id} for ${phone}`);
        }
      }

      // Check duplicate
      if (externalId) {
        const { data: existing } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("external_id", externalId)
          .maybeSingle();

        if (existing) {
          console.log(`Message ${externalId} already exists, skipping`);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Handle media: download from Evolution API and upload to storage
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (mediaInfo) {
        mediaType = mediaInfo.mediaType;
        console.log(`Media detected: ${mediaType}, attempting to download...`);

        // Check if base64 is already in the payload (some Evolution API configs include it)
        let base64Data = mediaInfo.base64;

        if (!base64Data) {
          // Download from Evolution API
          const evoConfig = await getEvolutionConfig(supabase);
          if (evoConfig) {
            const instanceName = await getInstanceName(evoConfig.baseUrl, evoConfig.apiKey);
            if (instanceName) {
              const downloaded = await downloadMediaFromEvolution(
                evoConfig.baseUrl, evoConfig.apiKey, instanceName, messageData
              );
              if (downloaded) {
                base64Data = downloaded.base64;
              }
            }
          }
        }

        if (base64Data) {
          // Remove data URI prefix if present
          const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
          mediaUrl = await uploadMediaToStorage(
            supabase, matchedLeadId, cleanBase64, mediaInfo.fileName, mediaInfo.mimeType
          );
          if (mediaUrl) {
            console.log(`Media uploaded successfully: ${mediaUrl.slice(0, 80)}...`);
          } else {
            console.log("Failed to upload media to storage");
          }
        } else {
          console.log("Could not obtain base64 data for media");
        }
      }

      // Save message
      const { error: saveError } = await supabase.from("whatsapp_messages").insert({
        lead_id: matchedLeadId,
        phone,
        direction,
        message: text || "",
        status: direction === "sent" ? "sent" : "received",
        external_id: externalId,
        media_type: mediaType,
        media_url: mediaUrl,
      });

      if (saveError) {
        console.error("Error saving message:", saveError);
      } else {
        console.log(`${direction} message saved from ${phone}, lead: ${matchedLeadId}, media: ${mediaType || "none"}`);
      }

      return new Response(JSON.stringify({ ok: true, lead_id: matchedLeadId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle message status updates
    if (event === "messages.update" || event === "MESSAGES_UPDATE") {
      const updates = Array.isArray(payload.data) ? payload.data : [payload.data || payload];

      for (const update of updates) {
        const externalId = update.key?.id;
        const status = update.update?.status;

        if (externalId && status) {
          const statusMap: Record<number, string> = {
            2: "delivered",
            3: "read",
            4: "played",
          };

          const newStatus = statusMap[status] || String(status);

          await supabase
            .from("whatsapp_messages")
            .update({ status: newStatus })
            .eq("external_id", externalId);

          console.log(`Message ${externalId} status updated to ${newStatus}`);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Unhandled event type: ${event}`);
    return new Response(JSON.stringify({ ok: true, event }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
