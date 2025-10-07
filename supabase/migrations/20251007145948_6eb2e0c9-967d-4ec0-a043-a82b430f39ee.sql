-- Add screenshot_url column to sim_activations table
ALTER TABLE sim_activations
ADD COLUMN IF NOT EXISTS screenshot_url text;