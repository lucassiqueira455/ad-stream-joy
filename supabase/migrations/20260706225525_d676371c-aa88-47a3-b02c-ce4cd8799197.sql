
-- Connections table
CREATE TABLE public.ad_platform_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  external_user_id TEXT,
  display_name TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_platform_connections TO authenticated;
GRANT ALL ON public.ad_platform_connections TO service_role;

ALTER TABLE public.ad_platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own connections"
  ON public.ad_platform_connections
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ad_platform_connections_updated_at
  BEFORE UPDATE ON public.ad_platform_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX ad_platform_connections_user_platform_idx
  ON public.ad_platform_connections(user_id, platform);

-- Ad accounts table
CREATE TABLE public.ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.ad_platform_connections(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  external_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  currency TEXT,
  timezone TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, external_account_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_accounts TO authenticated;
GRANT ALL ON public.ad_accounts TO service_role;

ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own ad accounts"
  ON public.ad_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ad_accounts_updated_at
  BEFORE UPDATE ON public.ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX ad_accounts_client_idx ON public.ad_accounts(client_id);
CREATE INDEX ad_accounts_user_platform_idx ON public.ad_accounts(user_id, platform);
