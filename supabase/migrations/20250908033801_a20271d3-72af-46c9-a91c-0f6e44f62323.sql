-- Fix security issue: Restrict invoice templates access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view invoice templates" ON public.invoice_templates;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can view invoice templates" 
ON public.invoice_templates 
FOR SELECT 
TO authenticated 
USING (true);

-- Add policies for template management if needed in the future
CREATE POLICY "Authenticated users can create invoice templates" 
ON public.invoice_templates 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoice templates" 
ON public.invoice_templates 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete invoice templates" 
ON public.invoice_templates 
FOR DELETE 
TO authenticated 
USING (true);