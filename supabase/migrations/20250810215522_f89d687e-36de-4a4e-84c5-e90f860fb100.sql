-- Create table for external SMS/WhatsApp messages
CREATE TABLE public.external_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms','whatsapp')),
  direction text NOT NULL CHECK (direction IN ('outbound','inbound')) DEFAULT 'outbound',
  to_number text,
  from_number text,
  content text NOT NULL,
  provider_sid text,
  status text NOT NULL DEFAULT 'sent',
  error jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_external_messages_conversation ON public.external_messages(conversation_id, created_at);
CREATE INDEX idx_external_messages_channel ON public.external_messages(channel);

-- Enable RLS
ALTER TABLE public.external_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view external messages in their conversations"
  ON public.external_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = external_messages.conversation_id
        AND (auth.uid() = c.therapist_id OR auth.uid() = c.client_id)
    )
  );

CREATE POLICY "Users can insert external messages in their conversations"
  ON public.external_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = external_messages.conversation_id
        AND auth.uid() = c.therapist_id
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_external_messages_updated_at
BEFORE UPDATE ON public.external_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();