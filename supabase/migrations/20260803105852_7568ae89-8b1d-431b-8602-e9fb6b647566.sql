CREATE TABLE public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key text,
  status text NOT NULL DEFAULT 'pending',
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT (id, workspace_id, user_id, connector_id, status, connected_at, created_at, updated_at) ON public.app_user_connections TO authenticated;
GRANT DELETE ON public.app_user_connections TO authenticated;
GRANT ALL ON public.app_user_connections TO service_role;

ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own connections" ON public.app_user_connections
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own connections" ON public.app_user_connections
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_app_user_connections_updated
  BEFORE UPDATE ON public.app_user_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS transcript text,
  ADD COLUMN IF NOT EXISTS action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS meetings_workspace_external_ref_idx
  ON public.meetings (workspace_id, external_ref) WHERE external_ref IS NOT NULL;