
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  department TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'Employee',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Profiles: users can update their own
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Profiles: users can insert their own
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update meeting_recordings RLS: drop public policies, add user-based ones
DROP POLICY IF EXISTS "Anyone can read recordings" ON public.meeting_recordings;
DROP POLICY IF EXISTS "Anyone can insert recordings" ON public.meeting_recordings;
DROP POLICY IF EXISTS "Anyone can delete recordings" ON public.meeting_recordings;

-- Add uploaded_by as UUID referencing auth (alter column type not possible, but uploaded_by is text, keep as text with auth.uid()::text)
CREATE POLICY "Authenticated users can read recordings"
ON public.meeting_recordings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert recordings"
ON public.meeting_recordings FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = uploaded_by);

CREATE POLICY "Users can delete their own recordings"
ON public.meeting_recordings FOR DELETE TO authenticated
USING (auth.uid()::text = uploaded_by);

CREATE POLICY "Users can update their own recordings"
ON public.meeting_recordings FOR UPDATE TO authenticated
USING (auth.uid()::text = uploaded_by);
