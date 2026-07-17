ALTER TABLE public.client_shares ADD COLUMN IF NOT EXISTS dashboard_token text UNIQUE;

UPDATE public.client_shares
SET dashboard_token = replace(replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '')
WHERE dashboard_token IS NULL;