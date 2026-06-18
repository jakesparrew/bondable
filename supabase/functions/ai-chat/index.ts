import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Check if AI API is enabled
    const { data: enabledSetting, error: enabledError } = await supabase
      .from('ai_settings')
      .select('setting_value')
      .eq('setting_name', 'ai_api_enabled')
      .single();

    if (enabledError || !enabledSetting?.setting_value?.enabled) {
      console.log('AI API is disabled');
      return new Response(JSON.stringify({ 
        response: "I'm sorry, but the AI assistant is currently disabled. Please contact your administrator." 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get AI model configuration
    const { data: modelSetting, error: modelError } = await supabase
      .from('ai_settings')
      .select('setting_value')
      .eq('setting_name', 'ai_model_config')
      .single();

    const modelConfig = modelSetting?.setting_value || { model: 'gpt-4.1-2025-04-14', max_tokens: 1000, temperature: 0.7 };

    const { message } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('AI Chat request received:', { 
      message: message.substring(0, 100) + '...', 
      model: modelConfig.model 
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages: [
          { 
            role: 'system', 
            content: `You are a helpful AI assistant for therapists and mental health professionals. You provide professional, evidence-based guidance on therapy practices, client management, treatment planning, and general mental health topics. 

Your responses should be:
- Professional and empathetic
- Based on established therapeutic practices and research
- Helpful for therapy practice management
- Supportive but not providing direct medical advice
- Encouraging best practices in mental health care

Always remind users that you're an AI assistant and that complex clinical decisions should involve consultation with colleagues or supervisors when appropriate.`
          },
          { role: 'user', content: message }
        ],
        max_tokens: modelConfig.max_tokens || 1000,
        temperature: modelConfig.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});