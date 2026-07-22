CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer','writer','admin')),
  scopes text[] NOT NULL DEFAULT ARRAY['decisions:read']::text[],
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX idx_api_keys_workspace ON public.api_keys(workspace_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view workspace api keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins create api keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "Admins update api keys"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins delete api keys"
  ON public.api_keys FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));