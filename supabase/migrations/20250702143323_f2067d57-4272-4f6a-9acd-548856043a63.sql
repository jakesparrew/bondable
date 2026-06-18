-- Create AI settings table for admin configuration
CREATE TABLE public.ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_name TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin users can manage AI settings" 
ON public.ai_settings 
FOR ALL 
USING (is_admin_user());

-- Insert default AI settings
INSERT INTO public.ai_settings (setting_name, setting_value) VALUES
('ai_api_enabled', '{"enabled": true}'),
('ai_model_config', '{"model": "gpt-4.1-2025-04-14", "max_tokens": 1000, "temperature": 0.7}');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();