UPDATE public.client_shares SET allow_date_change = true WHERE allow_date_change = false;
ALTER TABLE public.client_shares ALTER COLUMN allow_date_change SET DEFAULT true;
