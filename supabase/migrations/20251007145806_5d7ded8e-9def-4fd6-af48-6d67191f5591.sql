-- Create storage bucket for SIM activation screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sim-activation-screenshots',
  'sim-activation-screenshots',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Allow authenticated users to upload their own screenshots
CREATE POLICY "Users can upload their own screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sim-activation-screenshots' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own screenshots
CREATE POLICY "Users can view their own screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'sim-activation-screenshots' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all screenshots
CREATE POLICY "Admins can view all screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'sim-activation-screenshots'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add screenshot_url column to sim_activations table
ALTER TABLE sim_activations
ADD COLUMN screenshot_url text;