
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID NULL, -- Can reference sessions, messages, tasks, etc.
  related_type TEXT NULL, -- 'session', 'message', 'task', 'appointment', etc.
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at column
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
