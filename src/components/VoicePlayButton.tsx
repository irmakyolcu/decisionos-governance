import { useRef, useState } from 'react';
import { Volume2, Loader2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  text: string;
  voice?: string;
  label?: string;
  size?: 'sm' | 'default';
}

export function VoicePlayButton({ text, voice = 'alloy', label = 'Listen', size = 'sm' }: Props) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const handle = async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('voice-tts', {
        body: { text, voice },
      });
      if (error) throw error;
      const b64 = (data as any)?.audioContent;
      if (!b64) throw new Error('No audio returned');
      const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onpause = () => setPlaying(false);
      await audio.play();
      setPlaying(true);
    } catch (e: any) {
      toast({ title: 'Could not play audio', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="ghost" size={size} onClick={handle} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      {playing ? 'Stop' : label}
    </Button>
  );
}
