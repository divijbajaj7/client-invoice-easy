-- Add user_id column to invoice_templates table
ALTER TABLE public.invoice_templates 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing templates to have NULL user_id (will need manual assignment or deletion)
-- Alternatively, if there are no existing templates, this will just add the column

-- Make user_id NOT NULL after data migration (commented out - enable after assigning user_ids)
-- ALTER TABLE public.invoice_templates ALTER COLUMN user_id SET NOT NULL;

-- Drop existing overly permissive RLS policies
DROP POLICY IF EXISTS "Authenticated users can view invoice templates" ON public.invoice_templates;
DROP POLICY IF EXISTS "Authenticated users can create invoice templates" ON public.invoice_templates;
DROP POLICY IF EXISTS "Authenticated users can update invoice templates" ON public.invoice_templates;
DROP POLICY IF EXISTS "Authenticated users can delete invoice templates" ON public.invoice_templates;

-- Create new user-scoped RLS policies
CREATE POLICY "Users can view their own templates" 
ON public.invoice_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" 
ON public.invoice_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.invoice_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.invoice_templates 
FOR DELETE 
USING (auth.uid() = user_id);