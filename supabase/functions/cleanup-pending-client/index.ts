
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CleanupRequest {
  clientId: string;
  clientEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, clientEmail }: CleanupRequest = await req.json();

    console.log("Cleaning up pending client:", { clientId, clientEmail });

    // Initialize Supabase client with service role key for administrative operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First verify the client exists and matches the email
    const { data: existingClient, error: verifyError } = await supabaseAdmin
      .from("clients")
      .select("id, email, status")
      .eq("id", clientId)
      .eq("email", clientEmail)
      .eq("status", "Pending")
      .maybeSingle();

    if (verifyError) {
      console.error("Error verifying client:", verifyError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to verify client" 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    if (!existingClient) {
      console.log("No pending client found with matching ID and email");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Client already processed or not found" 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Delete the pending client record
    const { error: deleteError } = await supabaseAdmin
      .from("clients")
      .delete()
      .eq("id", clientId)
      .eq("email", clientEmail);

    if (deleteError) {
      console.error("Error deleting pending client:", deleteError);
      
      // If deletion fails, try to mark as processed instead
      const { error: updateError } = await supabaseAdmin
        .from("clients")
        .update({ status: 'Processed' })
        .eq("id", clientId);

      if (updateError) {
        console.error("Error marking client as processed:", updateError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Failed to cleanup pending client" 
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Client marked as processed" 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log("Successfully deleted pending client:", clientId);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Pending client cleaned up successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in cleanup function:", error);
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
