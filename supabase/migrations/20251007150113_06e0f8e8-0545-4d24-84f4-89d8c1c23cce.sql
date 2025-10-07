-- Make the sim-activation-screenshots bucket public so admins can view the images via WhatsApp
UPDATE storage.buckets 
SET public = true 
WHERE id = 'sim-activation-screenshots';