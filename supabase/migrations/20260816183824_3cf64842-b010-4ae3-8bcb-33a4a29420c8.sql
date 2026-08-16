CREATE TYPE public.process_relation AS ENUM ('next_step','depends_on','subprocess','related');

CREATE TABLE public.process_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  to_process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  relation public.process_relation NOT NULL DEFAULT 'next_step',
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT process_links_no_self CHECK (from_process_id <> to_process_id),
  CONSTRAINT process_links_unique UNIQUE (from_process_id, to_process_id, relation)
);

CREATE INDEX idx_process_links_from ON public.process_links(from_process_id);
CREATE INDEX idx_process_links_to ON public.process_links(to_process_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_links TO authenticated;
GRANT ALL ON public.process_links TO service_role;

ALTER TABLE public.process_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view process links"
ON public.process_links FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Writers can create process links"
ON public.process_links FOR INSERT TO authenticated
WITH CHECK (
  public.is_workspace_writer(auth.uid(), workspace_id)
  AND created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.processes p WHERE p.id = from_process_id AND p.workspace_id = process_links.workspace_id)
  AND EXISTS (SELECT 1 FROM public.processes p WHERE p.id = to_process_id AND p.workspace_id = process_links.workspace_id)
);

CREATE POLICY "Writers can update process links"
ON public.process_links FOR UPDATE TO authenticated
USING (public.is_workspace_writer(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_writer(auth.uid(), workspace_id));

CREATE POLICY "Writers can delete process links"
ON public.process_links FOR DELETE TO authenticated
USING (public.is_workspace_writer(auth.uid(), workspace_id));

CREATE TRIGGER trg_process_links_updated
BEFORE UPDATE ON public.process_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();