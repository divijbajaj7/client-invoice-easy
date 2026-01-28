-- Fix 1: Update get_next_invoice_number to use auth.uid() directly instead of accepting user_uuid parameter
-- This prevents privilege escalation where any user could query other users' invoice counts

CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    max_number INTEGER;
    next_number INTEGER;
BEGIN
    -- Get the highest invoice number for the authenticated user
    SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(invoice_number, '[^0-9]', '', 'g') AS INTEGER)), 0)
    INTO max_number
    FROM invoices
    WHERE user_id = auth.uid()
    AND invoice_number ~ '^[0-9]+$';
    
    -- Return the next number
    next_number := max_number + 1;
    RETURN next_number::TEXT;
END;
$$;

-- Fix 2: Fix storage bucket configuration conflict
-- Make the bucket private and ensure proper RLS policies

-- First make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'company-logos';

-- Drop any conflicting old policies that might exist
DROP POLICY IF EXISTS "Users can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company logos" ON storage.objects;

-- Drop newer policies too to recreate them cleanly
DROP POLICY IF EXISTS "Users can view their own company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own company logos" ON storage.objects;

-- Create clean user-scoped policies
CREATE POLICY "Users can view their own company logos" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own company logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own company logos" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own company logos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'company-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);