
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(user_uuid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    month_prefix TEXT;
    max_number INTEGER;
    next_number INTEGER;
BEGIN
    -- Get 3-letter month prefix (e.g., APR, MAY, JUN)
    month_prefix := UPPER(TO_CHAR(NOW(), 'MON'));
    
    -- Get the highest invoice number for this user in the current month prefix
    SELECT COALESCE(MAX(
        CAST(REGEXP_REPLACE(SUBSTRING(invoice_number FROM '-(.+)$'), '[^0-9]', '', 'g') AS INTEGER)
    ), 0)
    INTO max_number
    FROM invoices
    WHERE user_id = user_uuid
    AND invoice_number LIKE month_prefix || '-%';
    
    next_number := max_number + 1;
    RETURN month_prefix || '-' || LPAD(next_number::TEXT, 3, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    month_prefix TEXT;
    max_number INTEGER;
    next_number INTEGER;
BEGIN
    month_prefix := UPPER(TO_CHAR(NOW(), 'MON'));
    
    SELECT COALESCE(MAX(
        CAST(REGEXP_REPLACE(SUBSTRING(invoice_number FROM '-(.+)$'), '[^0-9]', '', 'g') AS INTEGER)
    ), 0)
    INTO max_number
    FROM invoices
    WHERE user_id = auth.uid()
    AND invoice_number LIKE month_prefix || '-%';
    
    next_number := max_number + 1;
    RETURN month_prefix || '-' || LPAD(next_number::TEXT, 3, '0');
END;
$function$;
