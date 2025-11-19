-- Add device_type column to sim_activations table
ALTER TABLE public.sim_activations 
ADD COLUMN device_type TEXT CHECK (device_type IN ('iOS', 'Android'));