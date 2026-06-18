
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  clientId: string;
  clientEmail: string;
  clientName: string;
  therapistName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, clientEmail, clientName, therapistName }: InvitationRequest = await req.json();

    console.log("Processing invitation for:", { clientId, clientEmail, clientName, therapistName });

    // Use your custom domain for the invitation link
    const invitationLink = `https://app.bondable.co/setup-password?clientId=${clientId}`;

    // Use your verified domain email address
    const fromEmail = "Bondable <noreply@bondable.co>";
    
    console.log("Sending email to:", clientEmail);
    console.log("Invitation link:", invitationLink);

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [clientEmail],
      subject: `Welcome to Bondable - Complete Your Account Setup`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">Welcome to Bondable</h1>
            <p style="color: #666; font-size: 16px;">Complete your account setup to get started</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="color: #333; font-size: 20px; margin-bottom: 15px;">Hi ${clientName},</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              ${therapistName} has invited you to join Bondable, a secure platform for managing your therapy journey.
            </p>
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              To complete your account setup and create your password, please click the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" 
                 style="background: #000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 500; display: inline-block;">
                Set Up Your Account
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Or copy and paste this link into your browser:<br>
              <a href="${invitationLink}" style="color: #007bff; word-break: break-all;">${invitationLink}</a>
            </p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="color: #856404; font-size: 14px; margin: 0; text-align: center;">
              <strong>Security Notice:</strong> This invitation link will expire in 7 days for your security.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p style="margin-top: 20px;">
              Questions? Contact your therapist or reach out to us at 
              <a href="mailto:support@bondable.co" style="color: #007bff;">support@bondable.co</a>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent response:", emailResponse);

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: emailResponse.error,
        message: "Failed to send invitation email"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
