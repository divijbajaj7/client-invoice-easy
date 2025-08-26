-- Add missing columns to companies table
ALTER TABLE public.companies
ADD COLUMN pan_number TEXT,
ADD COLUMN bank_name TEXT,
ADD COLUMN account_number TEXT,
ADD COLUMN ifsc_code TEXT,
ADD COLUMN branch TEXT;