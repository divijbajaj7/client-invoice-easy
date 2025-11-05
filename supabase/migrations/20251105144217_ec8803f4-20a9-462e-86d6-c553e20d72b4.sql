-- Add separate tax fields for IGST, CGST, and SGST
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS igst_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount numeric DEFAULT 0;