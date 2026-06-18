
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  notification_type: string;
  subject: string;
  message: string;
  user_data?: Record<string, any>;
  email_addresses?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  console.log("🔔 Admin notification request received:", req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { 
      notification_type, 
      subject, 
      message, 
      user_data = {}, 
      email_addresses = []
    }: AdminNotificationRequest = await req.json();

    console.log("📧 Processing admin notification:", {
      type: notification_type,
      emailCount: email_addresses.length,
      hasUserData: Object.keys(user_data).length > 0
    });

    // If no email addresses provided, fetch from notification settings
    let targetEmails = email_addresses;
    
    if (targetEmails.length === 0) {
      console.log("📋 Fetching notification settings for type:", notification_type);
      
      // Create Supabase client
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: settings, error: settingsError } = await supabase
        .from('admin_notification_settings')
        .select('email_addresses, is_enabled')
        .eq('notification_type', notification_type)
        .eq('is_enabled', true)
        .single();

      if (settingsError) {
        console.error("❌ Error fetching notification settings:", settingsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch notification settings" }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      if (!settings) {
        console.log("⚠️ No enabled notification settings found for type:", notification_type);
        return new Response(
          JSON.stringify({ message: "No enabled notification settings found" }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      // Extract email addresses from settings
      targetEmails = Array.isArray(settings.email_addresses) 
        ? settings.email_addresses.filter((email): email is string => typeof email === 'string')
        : [];

      console.log("📮 Found email addresses from settings:", targetEmails.length);
    }

    if (targetEmails.length === 0) {
      console.log("⚠️ No email addresses available for notification");
      return new Response(
        JSON.stringify({ message: "No email addresses configured for this notification type" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create email content
    const emailContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">Bondable Admin Notification</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
          <h2 style="color: #333; font-size: 20px; margin-bottom: 15px;">
            ${subject}
          </h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            ${message}
          </p>
          ${Object.keys(user_data).length > 0 ? `
            <div style="margin-top: 20px; padding: 20px; background: white; border-radius: 8px; border: 1px solid #e9ecef;">
              <h3 style="color: #333; margin-top: 0; font-size: 16px; margin-bottom: 15px;">User Details:</h3>
              ${Object.entries(user_data).map(([key, value]) => `
                <p style="margin: 8px 0; font-size: 14px; color: #555;">
                  <strong style="color: #333;">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> ${value}
                </p>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px;">
          <p style="margin-top: 20px;">
            This is an automated notification from the Bondable admin system.
          </p>
          <p>
            Questions? Contact support at 
            <a href="mailto:support@bondable.co" style="color: #007bff;">support@bondable.co</a>
          </p>
        </div>
      </div>
    `;

    // Use your verified domain email address - same as client invitations
    const fromEmail = "Bondable <noreply@bondable.co>";

    // Send emails to all recipients
    const emailPromises = targetEmails.map(async (email) => {
      try {
        const result = await resend.emails.send({
          from: fromEmail,
          to: [email],
          subject: subject,
          html: emailContent,
        });
        console.log(`✅ Email sent to ${email}:`, result);
        return { email, success: true, result };
      } catch (error) {
        console.error(`❌ Failed to send email to ${email}:`, error);
        return { email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`📊 Email results: ${successful.length} successful, ${failed.length} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful.length,
        failed: failed.length,
        results: results
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("❌ Error in send-admin-notification:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
