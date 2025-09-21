-- Add PAN number field to clients table
ALTER TABLE public.clients 
ADD COLUMN pan_number text;