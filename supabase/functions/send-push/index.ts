// Supabase Edge Function: send-push
// Sends FCM push notifications to all active devices for a user
// Requires FIREBASE_SERVICE_ACCOUNT_JSON secret to be set

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const raw = atob(b64);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buffer[i] = raw.charCodeAt(i);
  return buffer.buffer;
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (obj: any) => btoa(JSON.stringify(obj)).replace(/=+/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const toSign = `${enc(header)}.${enc(claim)}`;

  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const assertion = `${toSign}.${signature}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(`Token exchange failed: ${json.error || resp.statusText}`);
  return json.access_token as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

    if (!serviceAccountRaw) {
      return new Response(JSON.stringify({ error: "Missing FIREBASE_SERVICE_ACCOUNT_JSON" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceAccount = JSON.parse(serviceAccountRaw);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, title, body, data } = await req.json();
    if (!userId || !title) {
      return new Response(JSON.stringify({ error: "userId and title are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch active device tokens
    const { data: devices, error } = await supabase
      .from('user_devices')
      .select('token, platform')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    const tokens = (devices || []).map(d => d.token).filter(Boolean);

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: 'no-tokens' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let sent = 0;
    const results: any[] = [];

    for (const token of tokens) {
      const payload = {
        message: {
          token,
          notification: { title, body },
          data: data || {},
          android: { priority: 'high' },
            apns: {
              headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
              payload: { aps: { sound: 'default', badge: 1 } }
            },
        },
      };

      const res = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) sent += 1;
      results.push({ token, status: res.status });
    }

    return new Response(JSON.stringify({ success: true, sent, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error('send-push error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
