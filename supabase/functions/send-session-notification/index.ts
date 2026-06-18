import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SessionNotificationRequest {
  sessionId: string;
  clientEmail: string;
  therapistName: string;
  clientName: string;
  sessionDate: string;
  sessionTime: string;
  durationType: string;
  location?: string;
  sessionType: string;
  therapyType?: string;
  sessionFormat?: string;
  notes?: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(timeStr: string): string {
  return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function generateCalendarLink(session: SessionNotificationRequest): string {
  const startDate = new Date(`${session.sessionDate}T${session.sessionTime}`);
  const endDate = new Date(startDate.getTime() + parseInt(session.durationType) * 60000);
  
  const formatCalendarDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startTime = formatCalendarDate(startDate);
  const endTime = formatCalendarDate(endDate);
  
  const title = encodeURIComponent(`Therapy Session with ${session.therapistName}`);
  const details = encodeURIComponent(`
${session.therapyType ? `Therapy Type: ${session.therapyType}` : ''}
${session.sessionFormat ? `Format: ${session.sessionFormat}` : ''}
${session.location ? `Location: ${session.location}` : ''}
${session.notes ? `Notes: ${session.notes}` : ''}
  `.trim());
  
  const location = session.location ? encodeURIComponent(session.location) : '';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sessionData: SessionNotificationRequest = await req.json();
    console.log("📧 Sending session notification:", sessionData);

    const calendarLink = generateCalendarLink(sessionData);
    const formattedDate = formatDate(sessionData.sessionDate);
    const formattedTime = sessionData.sessionTime ? formatTime(sessionData.sessionTime) : 'Time not specified';

    const emailResponse = await resend.emails.send({
      from: "Bondable <noreply@bondable.co>",
      to: [sessionData.clientEmail],
      subject: `Your Session with ${sessionData.therapistName} is Confirmed`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Session Confirmation</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: hsl(222.2, 84%, 4.9%); 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
              background-color: hsl(0, 0%, 100%);
            }
            .header { 
              background: hsl(222.2, 47.4%, 11.2%); 
              color: hsl(210, 40%, 98%); 
              padding: 30px; 
              border-radius: 8px 8px 0 0; 
              text-align: center; 
            }
            .content { 
              background: hsl(0, 0%, 100%); 
              padding: 30px; 
              border: 1px solid hsl(214.3, 31.8%, 91.4%); 
              border-top: none; 
            }
            .session-details { 
              background: hsl(210, 40%, 96.1%); 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            .detail-row { 
              display: flex; 
              margin-bottom: 10px; 
            }
            .detail-label { 
              font-weight: 600; 
              width: 140px; 
              color: hsl(215.4, 16.3%, 46.9%); 
            }
            .detail-value { 
              color: hsl(222.2, 84%, 4.9%); 
            }
            .calendar-button { 
              display: inline-block; 
              background: hsl(222.2, 47.4%, 11.2%); 
              color: hsl(210, 40%, 98%); 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              font-weight: 600; 
              margin: 20px 0; 
              text-align: center; 
            }
            .calendar-button:hover { 
              opacity: 0.9; 
            }
            .footer { 
              background: hsl(210, 40%, 96.1%); 
              padding: 20px; 
              border-radius: 0 0 8px 8px; 
              text-align: center; 
              font-size: 14px; 
              color: hsl(215.4, 16.3%, 46.9%); 
            }
            .logo { 
              font-size: 20px; 
              font-weight: 700; 
              margin-bottom: 10px; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Bondable</div>
            <h1 style="margin: 0; font-size: 24px;">Your Session is Confirmed</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your therapy session has been scheduled</p>
          </div>
          
          <div class="content">
            <p>Hello ${sessionData.clientName},</p>
            <p>Your therapy session with <strong>${sessionData.therapistName}</strong> has been confirmed.</p>
            
            <div class="session-details">
              <h3 style="margin-top: 0; color: hsl(215.4, 16.3%, 46.9%);">Session Details</h3>
              
              <div class="detail-row">
                <span class="detail-label">Therapist:</span>
                <span class="detail-value">${sessionData.therapistName}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${formattedTime}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${sessionData.durationType} minutes</span>
              </div>
              
              
              ${sessionData.therapyType ? `
              <div class="detail-row">
                <span class="detail-label">Therapy Type:</span>
                <span class="detail-value">${sessionData.therapyType}</span>
              </div>
              ` : ''}
              
              ${sessionData.sessionFormat ? `
              <div class="detail-row">
                <span class="detail-label">Format:</span>
                <span class="detail-value">${sessionData.sessionFormat}</span>
              </div>
              ` : ''}
              
              ${sessionData.location ? `
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${sessionData.location}</span>
              </div>
              ` : ''}
              
              ${sessionData.notes ? `
              <div class="detail-row">
                <span class="detail-label">Notes:</span>
                <span class="detail-value">${sessionData.notes}</span>
              </div>
              ` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${calendarLink}" class="calendar-button" target="_blank">
                📅 Add to Calendar
              </a>
            </div>
            
            <p style="margin-top: 30px; color: hsl(215.4, 16.3%, 46.9%);">
              You can also view this session from your Bondable dashboard.
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Bondable.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("📧 Session notification sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in send-session-notification function:", error);
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