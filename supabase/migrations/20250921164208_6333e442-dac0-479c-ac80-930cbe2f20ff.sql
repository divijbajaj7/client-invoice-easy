-- Fix function search path issue
CREATE OR REPLACE FUNCTION get_next_invoice_number(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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