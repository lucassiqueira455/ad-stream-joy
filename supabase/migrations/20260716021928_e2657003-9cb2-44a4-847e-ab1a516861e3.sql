
CREATE TABLE public.client_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  allow_date_change boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_shares TO authenticated;
GRANT ALL ON public.client_shares TO service_role;

ALTER TABLE public.client_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their client shares"
  ON public.client_shares
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_client_shares_updated_at
  BEFORE UPDATE ON public.client_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX client_shares_token_active_idx ON public.client_shares(token) WHERE active = true;
