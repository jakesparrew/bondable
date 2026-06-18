
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId } = await req.json();

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "Client ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Fetching client data for ID:", clientId);

    // Create Supabase client with service role to access clients table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch client data from the clients table
    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("status", "Pending")
      .single();

    if (error) {
      console.error("Error fetching client:", error);
      return new Response(
        JSON.stringify({ error: "Client not found or invitation expired" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!client) {
      return new Response(
        JSON.stringify({ error: "Client not found or invitation expired" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Client data found:", client);

    return new Response(
      JSON.stringify({ client }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in get-client-data function:", error);
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
