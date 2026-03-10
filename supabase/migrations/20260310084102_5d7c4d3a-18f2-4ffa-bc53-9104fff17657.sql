
-- Create storage bucket for meeting recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-recordings', 'meeting-recordings', true);

-- Create meeting_recordings table
CREATE TABLE public.meeting_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read recordings (public app with mock data, no auth yet)
CREATE POLICY "Anyone can read recordings"
  ON public.meeting_recordings FOR SELECT
  USING (true);

-- Allow anyone to insert recordings
CREATE POLICY "Anyone can insert recordings"
  ON public.meeting_recordings FOR INSERT
  WITH CHECK (true);

-- Allow anyone to delete recordings
CREATE POLICY "Anyone can delete recordings"
  ON public.meeting_recordings FOR DELETE
  USING (true);

-- Storage policies for meeting-recordings bucket
CREATE POLICY "Anyone can upload meeting recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meeting-recordings');

CREATE POLICY "Anyone can view meeting recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meeting-recordings');

CREATE POLICY "Anyone can delete meeting recordings"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'meeting-recordings');
