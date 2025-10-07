-- Create table for SIM card activations
CREATE TABLE public.sim_activations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activation_type TEXT NOT NULL CHECK (activation_type IN ('chip', 'esim')),
  barcode TEXT,
  imei TEXT,
  eid TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'activated', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sim_activations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own activations" 
ON public.sim_activations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activations" 
ON public.sim_activations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activations" 
ON public.sim_activations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sim_activations_updated_at
BEFORE UPDATE ON public.sim_activations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();