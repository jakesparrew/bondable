
-- Create a table to manage client-therapist relationships
CREATE TABLE public.client_therapist_relationships (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL,
    therapist_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(client_id, therapist_id)
);

-- Enable Row Level Security
ALTER TABLE public.client_therapist_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies for client_therapist_relationships
CREATE POLICY "Users can view their own relationships" 
    ON public.client_therapist_relationships 
    FOR SELECT 
    USING (
        auth.uid() = client_id OR 
        auth.uid() = therapist_id
    );

CREATE POLICY "Clients can create relationships" 
    ON public.client_therapist_relationships 
    FOR INSERT 
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update their own relationships" 
    ON public.client_therapist_relationships 
    FOR UPDATE 
    USING (
        auth.uid() = client_id OR 
        auth.uid() = therapist_id
    );

-- Add trigger for updated_at
CREATE TRIGGER update_client_therapist_relationships_updated_at
    BEFORE UPDATE ON public.client_therapist_relationships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
