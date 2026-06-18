import { useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onTranscript: (text: string) => void;
  size?: 'sm' | 'default';
  label?: string;
}

export function VoiceInputButton({ onTranscript, size = 'sm', label }: Props) {
  const { recording, start, stop } = useVoiceRecorder();
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (processing) return;
    if (!recording) {
      await start();
      return;
    }
    const blob = await stop();
    if (!blob) {
      toast({ title: 'No audio captured', description: 'Hold and speak for at least a second', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      const file = new File([blob], 'recording.webm', { type: blob.type });
      const form = new FormData();
      form.append('file', file);
      const { data, error } = await supabase.functions.invoke('voice-transcribe', { body: form });
      if (error) throw error;
      const text = (data as any)?.text?.trim();
      if (!text) throw new Error('No transcript');
      onTranscript(text);
    } catch (e: any) {
      toast({ title: 'Transcription failed', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const icon = processing ? <Loader2 className="h-4 w-4 animate-spin" /> :
    recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />;

  return (
    <Button
      type="button"
      variant={recording ? 'destructive' : 'outline'}
      size={size}
      onClick={handleClick}
      disabled={processing}
      className={recording ? 'animate-pulse' : ''}
    >
      {icon}
      {label ?? (recording ? 'Stop' : processing ? 'Transcribing…' : 'Speak')}
    </Button>
  );
}
