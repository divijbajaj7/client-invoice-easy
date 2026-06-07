REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;