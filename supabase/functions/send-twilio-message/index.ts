// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
interface Payload {
  to: string;
  body: string;
  channel: "sms" | "whatsapp";
  conversationId?: string;
}

// CORS headers for web clients
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Supabase service client for DB writes
const supabaseService = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Helpers to normalize WhatsApp numbers to E.164 and avoid double prefixes
function normalizeWhatsAppTo(to: string): string {
  let s = to.trim();
  // Remove whatsapp: if present for sanitation
  if (s.toLowerCase().startsWith("whatsapp:")) s = s.slice(9);
  // Remove common formatting characters and spaces
  s = s.replace(/[\s\-()]/g, "");
  // Ensure it starts with '+' (E.164). If not, leave as-is (we can't infer country code)
  if (!s.startsWith("+") && /^\d+$/.test(s)) {
    s = "+" + s;
  }
  return `whatsapp:${s}`;
}

function normalizeWhatsAppFrom(fromEnv: string): string {
  let s = fromEnv.trim();
  if (s.toLowerCase().startsWith("whatsapp:")) s = s.slice(9);
  s = s.replace(/[\s\-()]/g, "");
  if (!s.startsWith("+")) {
    s = "+" + s;
  }
  return `whatsapp:${s}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { to, body, channel, conversationId } = (await req.json()) as Payload;

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_FROM");
    const whatsappFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");

    if (!accountSid || !authToken) {
      return new Response(JSON.stringify({ error: "Missing Twilio credentials" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let from: string | undefined = fromNumber;
    let toFormatted = to;

    if (channel === "whatsapp") {
      if (!whatsappFrom) {
        return new Response(JSON.stringify({ error: "Missing WhatsApp sender number" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      from = normalizeWhatsAppFrom(whatsappFrom);
      toFormatted = normalizeWhatsAppTo(to);
    }

    if (!from) {
      return new Response(JSON.stringify({ error: "Missing Twilio FROM number" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const params = new URLSearchParams({
      To: toFormatted,
      From: from,
      Body: body,
    });

    const twilioResp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const twilioData = await twilioResp.json();

    if (!twilioResp.ok) {
      // Log error details for debugging in Supabase logs (sanitized)
      console.log("Twilio error response", {
        status: twilioResp.status,
        error: twilioData,
        channel,
      });
      return new Response(JSON.stringify({ error: twilioData }), {
        status: twilioResp.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    // Persist outbound message if conversationId provided
    if (conversationId) {
      const insertRes = await supabaseService
        .from("external_messages")
        .insert({
          conversation_id: conversationId,
          channel,
          direction: "outbound",
          to_number: toFormatted,
          from_number: from,
          content: body,
          provider_sid: twilioData.sid,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      if (insertRes.error) {
        console.log("Failed to persist external message", insertRes.error);
      }
    }

    return new Response(JSON.stringify({ success: true, sid: twilioData.sid }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("Twilio send error", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
