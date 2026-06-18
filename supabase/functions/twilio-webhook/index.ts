// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Normalize phone to E.164 (+digits), remove whatsapp: prefix if present
function normalizePhone(input: string): string {
  let s = (input || "").trim();
  if (s.toLowerCase().startsWith("whatsapp:")) s = s.slice(9);
  s = s.replace(/[\s\-()]/g, "");
  if (!s.startsWith("+") && /^\d+$/.test(s)) s = "+" + s;
  return s;
}

// Return only digits from a phone string (strip + and formatting, handle whatsapp:)
function phoneDigits(input: string): string {
  let s = (input || "").trim();
  if (s.toLowerCase().startsWith("whatsapp:")) s = s.slice(9);
  return s.replace(/\D/g, "");
}

// Comparable form for matching (digits only)
function phoneComparable(input: string): string {
  return phoneDigits(normalizePhone(input));
}

// Verify Twilio signature (optional; do not block if missing/mismatch)
async function verifyTwilioSignature(req: Request, bodyText: string): Promise<boolean> {
  const signature = req.headers.get("x-twilio-signature") || req.headers.get("X-Twilio-Signature");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!signature || !authToken) return true; // allow if not configured

  // Build the expected signature: HMAC-SHA1 over URL + sorted param key/values
  const url = req.url;
  const params = new URLSearchParams(bodyText);
  const keys = Array.from(params.keys()).sort();
  const data = url + keys.map((k) => k + params.get(k)).join("");

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return expected === signature;
}

// Send a message back via Twilio (SMS or WhatsApp)
async function twilioSend({ to, body, channel }: { to: string; body: string; channel: "sms" | "whatsapp" }) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const smsFrom = Deno.env.get("TWILIO_FROM");
  const waFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");

  if (!accountSid || !authToken) {
    console.warn("Twilio credentials not configured; cannot send reply");
    return;
  }

  const isWhatsApp = channel === "whatsapp";
  const from = isWhatsApp ? waFrom : smsFrom;
  const toParam = isWhatsApp ? `whatsapp:${normalizePhone(to)}` : normalizePhone(to);
  const fromParam = isWhatsApp ? (waFrom?.toLowerCase().startsWith("whatsapp:") ? waFrom! : `whatsapp:${normalizePhone(waFrom || "")}`) : normalizePhone(from || "");

  if (!from) {
    console.warn("No FROM number configured for channel", channel);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams();
  form.set("To", toParam);
  form.set("From", fromParam);
  form.set("Body", body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    console.error("Twilio send failed", res.status, await res.text());
  }
}

// Helper: get or create conversation between therapist and client
async function getOrCreateConversation(supabase: any, therapistId: string, clientId: string): Promise<string | null> {
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("therapist_id", therapistId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (conv?.id) return conv.id as string;

  const { data: created, error: convErr } = await supabase
    .from("conversations")
    .insert({ therapist_id: therapistId, client_id: clientId })
    .select("id")
    .single();

  if (convErr) {
    console.log("Create conversation failed", convErr);
    return null;
  }
  return created?.id as string;
}

// Resolve profile by phone digits or by client's email when possible
async function findProfileByPhoneOrClientFallback(supabase: any, from: string) {
  const fromDigits = phoneComparable(from);
  const last7 = fromDigits.slice(-7);
  const fromNorm = normalizePhone(from);

  // Try profiles by phone (strict digits match preferred)
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, role, phone, email, first_name, last_name")
    .or(`phone.eq.${fromNorm},phone.ilike.%${last7}%`);

  let profile = (profs || []).find((p: any) => phoneComparable(p.phone || "") === fromDigits) || (profs || [])[0];

  if (profile) return { profile };

  // Fallback: use clients table to find a matching client by phone, then map to profile via email
  const { data: clients } = await supabase
    .from("clients")
    .select("first_name, last_name, email, therapist_id, phone")
    .or(`phone.eq.${fromNorm},phone.ilike.%${last7}%`)
    .limit(5);

  const client = (clients || []).find((c: any) => phoneComparable(c.phone || "") === fromDigits) || (clients || [])[0];

  if (client?.email) {
    const { data: profByEmail } = await supabase
      .from("profiles")
      .select("id, role, phone, email, first_name, last_name")
      .eq("email", client.email)
      .maybeSingle();

    if (profByEmail) {
      return { profile: profByEmail, fallbackTherapistId: client.therapist_id };
    }
  }

  return { profile: null };
}

// Fetch active counterpart options for a user
async function getActiveRelationships(supabase: any, actorRole: "client" | "therapist", userId: string) {
  if (actorRole === "client") {
    // Therapists connected to client
    const { data: rels } = await supabase
      .from("client_therapist_relationships")
      .select("therapist_id")
      .eq("client_id", userId)
      .eq("status", "active");

    const therapistIds = (rels || []).map((r: any) => r.therapist_id);
    if (therapistIds.length === 0) return [] as any[];

    const { data: therapists } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", therapistIds);

    return (therapists || []).map((t: any) => ({ id: t.id, name: `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Therapist" }));
  } else {
    // Clients connected to therapist
    const { data: rels } = await supabase
      .from("client_therapist_relationships")
      .select("client_id")
      .eq("therapist_id", userId)
      .eq("status", "active");

    const clientIds = (rels || []).map((r: any) => r.client_id);
    if (clientIds.length === 0) return [] as any[];

    const { data: clients } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", clientIds);

    return (clients || []).map((c: any) => ({ id: c.id, name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Client" }));
  }
}

function buildSelectionMessage(actorRole: "client" | "therapist", options: { id: string; name: string }[]) {
  const header = actorRole === "client" ? "Who do you wish to contact?" : "Who do you wish to contact?";
  const lines = options.map((o, i) => `${i + 1}. ${o.name || (actorRole === "client" ? "Therapist" : "Client")}`);
  const footer = "Reply with the number. Send 'exit' anytime to leave the chat.";
  return [header, ...lines, footer].join("\n");
}

async function upsertSession(
  supabase: any,
  {
    channel,
    phone_digits,
    user_id,
    actor_role,
    selected_id,
    state,
    options,
  }: {
    channel: string;
    phone_digits: string;
    user_id?: string | null;
    actor_role: "client" | "therapist";
    selected_id?: string | null;
    state: "selecting" | "active";
    options?: any;
  },
) {
  const payload: any = {
    channel,
    phone_digits,
    user_id: user_id ?? null,
    actor_role,
    selected_id: selected_id ?? null,
    state,
    options: options ?? null,
    last_message_at: new Date().toISOString(),
    expire_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1h
  };

  const { data: existing } = await supabase
    .from("messaging_sessions")
    .select("id")
    .eq("channel", channel)
    .eq("phone_digits", phone_digits)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("messaging_sessions").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("messaging_sessions").insert({ ...payload });
  }
}

serve(async (req) => {
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

    const contentType = req.headers.get("content-type") || "";
    const bodyText = await req.text();
    const isForm = contentType.includes("application/x-www-form-urlencoded");
    const form = isForm ? new URLSearchParams(bodyText) : new URLSearchParams();

    // Verify Twilio signature when possible (non-blocking)
    const verified = await verifyTwilioSignature(req, bodyText);
    if (!verified) {
      console.warn("Twilio signature verification failed; proceeding");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Extract common Twilio fields
    const MessageSid = form.get("MessageSid") || form.get("SmsSid") || undefined;
    const From = form.get("From") || "";
    const To = form.get("To") || "";
    const Body = (form.get("Body") || "").trim();
    const MessageStatus = form.get("MessageStatus");

    // Status callback update
    if (MessageStatus && MessageSid) {
      await supabase
        .from("external_messages")
        .update({
          status: MessageStatus,
          delivered_at: MessageStatus === "delivered" ? new Date().toISOString() : undefined,
          read_at: MessageStatus === "read" ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_sid", MessageSid);

      return new Response("", { status: 200, headers: { ...corsHeaders } });
    }

    // Inbound message handling
    if (From && To && Body !== null) {
      const fromNorm = normalizePhone(From);
      const toNorm = normalizePhone(To);
      const channel = From.toLowerCase().startsWith("whatsapp:") ? "whatsapp" : "sms";
      const fromDigits = phoneComparable(From);
      const last7 = fromDigits.slice(-7);
      console.log("Inbound parsed", { From, To, BodyLength: Body.length, channel, last7 });

      // Load existing session (if any)
      const { data: session } = await supabase
        .from("messaging_sessions")
        .select("*")
        .eq("channel", channel)
        .eq("phone_digits", fromDigits)
        .maybeSingle();

      // Resolve sender profile (and possible fallback therapistId)
      const { profile, fallbackTherapistId } = await findProfileByPhoneOrClientFallback(supabase, From);

      // If exit requested, clear session and prompt selection if relationships exist
      if (/exit/i.test(Body.trim())) {
        if (profile?.id) {
          const actorRole = (profile.role as string) === "therapist" ? "therapist" : "client";
          const options = await getActiveRelationships(supabase, actorRole, profile.id);
        if (options.length > 0) {
          await upsertSession(supabase, {
            channel,
            phone_digits: fromDigits,
            user_id: profile.id,
            actor_role: actorRole,
            selected_id: null,
            state: "selecting",
            options,
          });
          await twilioSend({ to: fromNorm, channel, body: "You have exited the chat." });
          return new Response("", { status: 200, headers: { ...corsHeaders } });
        }
        }
        // No relationships; inform user
        await twilioSend({ to: fromNorm, channel, body: "No active connections found. Please contact your therapist to connect first." });
         return new Response("", { status: 200, headers: { ...corsHeaders } });
      }

      // If we have a selecting session and the user sent a number, try to select
      if (session && session.state === "selecting" && /^\d+$/.test(Body)) {
        const idx = parseInt(Body, 10) - 1;
        const opts = Array.isArray(session.options) ? session.options as any[] : [];
        const chosen = opts[idx];
        if (chosen?.id && profile?.id) {
          await upsertSession(supabase, {
            channel,
            phone_digits: fromDigits,
            user_id: profile.id,
            actor_role: (profile.role as string) === "therapist" ? "therapist" : "client",
            selected_id: chosen.id,
            state: "active",
            options: opts,
          });
          await twilioSend({ to: fromNorm, channel, body: `You are now chatting with ${chosen.name}. Send 'exit' to change.` });
           return new Response("", { status: 200, headers: { ...corsHeaders } });
        }
      }

      // If active session exists, route message accordingly
      if (session && session.state === "active" && session.selected_id && profile?.id) {
        const actorRole = (profile.role as string) === "therapist" ? "therapist" : "client";
        const therapistId = actorRole === "client" ? session.selected_id as string : profile.id as string;
        const clientId = actorRole === "client" ? profile.id as string : session.selected_id as string;
        const conversationId = await getOrCreateConversation(supabase, therapistId, clientId);
         if (!conversationId) return new Response("", { status: 200, headers: { ...corsHeaders } });

        await supabase.from("external_messages").insert({
          conversation_id: conversationId,
          channel,
          direction: "inbound",
          to_number: toNorm,
          from_number: fromNorm,
          content: Body,
          provider_sid: MessageSid,
          status: "received",
          sent_at: new Date().toISOString(),
        });
         return new Response("", { status: 200, headers: { ...corsHeaders } });
      }

      // No active session; figure out relationships
      if (!profile?.id) {
        console.log("Inbound message: profile not found", { fromNorm, fromDigits, last7 });
        await twilioSend({ to: fromNorm, channel, body: "We couldn't identify your account. Please contact your therapist to set up your profile." });
        return new Response("", { status: 200, headers: { ...corsHeaders } });
      }

      const actorRole = (profile.role as string) === "therapist" ? "therapist" : "client";
      let options = await getActiveRelationships(supabase, actorRole, profile.id as string);

      // If no relationships for client but a fallback therapistId was found via clients table, use it
      if (options.length === 0 && fallbackTherapistId && actorRole === "client") {
        const { data: tProf } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("id", fallbackTherapistId)
          .maybeSingle();
        if (tProf?.id) {
          options = [{ id: tProf.id, name: `${tProf.first_name || ""} ${tProf.last_name || ""}`.trim() || "Therapist" }];
        }
      }

      if (options.length === 0) {
        console.log("No relationships found for sender", { userId: profile.id, actorRole });
        await twilioSend({ to: fromNorm, channel, body: "No active connections found. Please connect with your therapist first." });
         return new Response("", { status: 200, headers: { ...corsHeaders } });
      }

      if (options.length === 1) {
        // Single relationship: route immediately and maintain an active session
        const counterpartId = options[0].id as string;
        await upsertSession(supabase, {
          channel,
          phone_digits: fromDigits,
          user_id: profile.id as string,
          actor_role: actorRole,
          selected_id: counterpartId,
          state: "active",
          options,
        });

        const therapistId = actorRole === "client" ? counterpartId : (profile.id as string);
        const clientId = actorRole === "client" ? (profile.id as string) : counterpartId;
        const conversationId = await getOrCreateConversation(supabase, therapistId, clientId);
        if (!conversationId) return new Response("", { status: 200, headers: { ...corsHeaders } });

        await supabase.from("external_messages").insert({
          conversation_id: conversationId,
          channel,
          direction: "inbound",
          to_number: toNorm,
          from_number: fromNorm,
          content: Body,
          provider_sid: MessageSid,
          status: "received",
          sent_at: new Date().toISOString(),
        });

         return new Response("", { status: 200, headers: { ...corsHeaders } });
      }

      // Multiple relationships: prompt for selection and store options in session
      await upsertSession(supabase, {
        channel,
        phone_digits: fromDigits,
        user_id: profile.id as string,
        actor_role: actorRole,
        selected_id: null,
        state: "selecting",
        options,
      });

      await twilioSend({ to: fromNorm, channel, body: buildSelectionMessage(actorRole, options) });
      return new Response("", { status: 200, headers: { ...corsHeaders } });
    }

    return new Response("", { status: 200, headers: { ...corsHeaders } });
  } catch (e: any) {
    console.error("Twilio webhook error", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
