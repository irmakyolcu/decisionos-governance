
-- Create workspace role enum
CREATE TYPE public.workspace_role AS ENUM ('admin', 'approver', 'viewer');

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Create workspace_members table
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Create workspace_invites table
CREATE TABLE public.workspace_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Add workspace_id to profiles
ALTER TABLE public.profiles ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Security definer function to get user's workspace_id
CREATE OR REPLACE FUNCTION public.get_user_workspace_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id LIMIT 1;
$$;

-- Security definer function to check workspace role
CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id UUID, _workspace_id UUID)
RETURNS workspace_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id LIMIT 1;
$$;

-- RLS: workspaces - members can view their workspace
CREATE POLICY "Members can view their workspace"
ON public.workspaces FOR SELECT
TO authenticated
USING (id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS: workspaces - authenticated users can create
CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid()::uuid);

-- RLS: workspaces - admins can update
CREATE POLICY "Admins can update workspace"
ON public.workspaces FOR UPDATE
TO authenticated
USING (public.get_workspace_role(auth.uid(), id) = 'admin');

-- RLS: workspace_members - members can view their workspace members
CREATE POLICY "Members can view workspace members"
ON public.workspace_members FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- RLS: workspace_members - admins can insert members
CREATE POLICY "Admins can add members"
ON public.workspace_members FOR INSERT
TO authenticated
WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) = 'admin');

-- RLS: workspace_members - admins can update member roles
CREATE POLICY "Admins can update member roles"
ON public.workspace_members FOR UPDATE
TO authenticated
USING (public.get_workspace_role(auth.uid(), workspace_id) = 'admin');

-- RLS: workspace_members - admins can remove members
CREATE POLICY "Admins can remove members"
ON public.workspace_members FOR DELETE
TO authenticated
USING (public.get_workspace_role(auth.uid(), workspace_id) = 'admin');

-- RLS: workspace_invites - admins can manage invites
CREATE POLICY "Admins can view workspace invites"
ON public.workspace_invites FOR SELECT
TO authenticated
USING (public.get_workspace_role(auth.uid(), workspace_id) = 'admin');

CREATE POLICY "Admins can create invites"
ON public.workspace_invites FOR INSERT
TO authenticated
WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) = 'admin');

CREATE POLICY "Admins can delete invites"
ON public.workspace_invites FOR DELETE
TO authenticated
USING (public.get_workspace_role(auth.uid(), workspace_id) = 'admin');

-- Public policy for accepting invites by token
CREATE POLICY "Anyone can view invite by token"
ON public.workspace_invites FOR SELECT
TO authenticated
USING (true);

-- RLS: meeting_recordings - add workspace isolation
ALTER TABLE public.meeting_recordings ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Update meeting_recordings policies for workspace isolation
DROP POLICY IF EXISTS "Authenticated users can read recordings" ON public.meeting_recordings;
CREATE POLICY "Members can read workspace recordings"
ON public.meeting_recordings FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Update profiles policy for workspace isolation
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by workspace members"
ON public.profiles FOR SELECT
TO authenticated
USING (
  workspace_id IS NULL 
  OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);

-- Trigger for workspace updated_at
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
