-- Create public bucket for site assets (videos, images, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true);

-- Policy for public read access
CREATE POLICY "Allow public read access on site-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

-- Policy for authenticated users to upload (admin only)
CREATE POLICY "Allow admin upload on site-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'site-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);