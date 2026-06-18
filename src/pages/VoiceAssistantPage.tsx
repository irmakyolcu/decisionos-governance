import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Volume2, Sparkles } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Turn = { role: 'user' | 'assistant'; content: string };

export default function VoiceAssistantPage() {
  const { recording, start, stop } = useVoiceRecorder();
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const speak = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('voice-tts', { body: { text } });
      if (error) throw error;
      const b64 = (data as any)?.audioContent;
      if (!b64) return;
      audioRef.current?.pause();
      const a = new Audio(`data:audio/mpeg;base64,${b64}`);
      audioRef.current = a;
      await a.play();
    } catch (e: any) {
      toast({ title: 'Playback failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleMic = async () => {
    if (busy) return;
    if (!recording) {
      await start();
      return;
    }
    const blob = await stop();
    if (!blob) {
      toast({ title: 'Recording too short', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', new File([blob], 'q.webm', { type: blob.type }));
      const tr = await supabase.functions.invoke('voice-transcribe', { body: form });
      if (tr.error) throw tr.error;
      const userText = (tr.data as any)?.text?.trim();
      if (!userText) throw new Error('Empty transcript');

      const nextTurns: Turn[] = [...turns, { role: 'user', content: userText }];
      setTurns(nextTurns);

      const ch = await supabase.functions.invoke('voice-chat', {
        body: { messages: nextTurns.map((t) => ({ role: t.role, content: t.content })) },
      });
      if (ch.error) throw ch.error;
      const reply = (ch.data as any)?.reply ?? '';
      setTurns([...nextTurns, { role: 'assistant', content: reply }]);
      if (reply) speak(reply);
    } catch (e: any) {
      toast({ title: 'Assistant error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="page-header">
        <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">Voice Assistant</p>
        <h1 className="page-title">Ask the CEO Twin out loud</h1>
        <p className="page-description">Tap the mic, ask a decision question, and get a CEO-aligned call back — spoken in the founder's operating voice.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Conversation</CardTitle>
          <Button
            type="button"
            size="lg"
            variant={recording ? 'destructive' : 'default'}
            onClick={handleMic}
            disabled={busy}
            className={recording ? 'animate-pulse' : ''}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> :
              recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
            {busy ? 'Thinking…' : recording ? 'Stop & send' : 'Hold to ask'}
          </Button>
        </CardHeader>
        <CardContent>
          {turns.length === 0 ? (
            <div className="min-h-[280px] flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm max-w-sm">
                Try: <span className="text-foreground">"Should I approve a €40k pilot with a new accelerator partner?"</span>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {turns.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                    t.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground border border-border'
                  }`}>
                    {t.content}
                    {t.role === 'assistant' && (
                      <button
                        onClick={() => speak(t.content)}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Volume2 className="h-3 w-3" />Replay
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
