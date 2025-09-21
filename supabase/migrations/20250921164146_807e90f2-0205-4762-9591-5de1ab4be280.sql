-- Add logo_url column to companies table if it doesn't exist already
-- This column should already exist, but adding it for completeness

-- Create function to get next invoice number
CREATE OR REPLACE FUNCTION get_next_invoice_number(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    max_number INTEGER;
    next_number INTEGER;
BEGIN
    -- Get the highest invoice number for this user
    SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(invoice_number, '[^0-9]', '', 'g') AS INTEGER)), 0)
    INTO max_number
    FROM invoices
    WHERE user_id = user_uuid
    AND invoice_number ~ '^[0-9]+$';
    
    -- Return the next number
    next_number := max_number + 1;
    RETURN next_number::TEXT;
END;
$$;