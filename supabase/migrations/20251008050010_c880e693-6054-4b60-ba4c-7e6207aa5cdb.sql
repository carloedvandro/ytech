-- Adicionar políticas RLS para o bucket sim-activation-screenshots

-- Política para admins fazerem upload em qualquer pasta (incluindo qr-codes/)
CREATE POLICY "Admins can upload QR codes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sim-activation-screenshots' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Política para admins atualizarem arquivos
CREATE POLICY "Admins can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sim-activation-screenshots' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Política para admins deletarem arquivos
CREATE POLICY "Admins can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sim-activation-screenshots' AND
  has_role(auth.uid(), 'admin'::app_role)
);