import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Send, ThumbsUp, ThumbsDown, Meh, Loader2, FileText, GitBranch, ArrowRight } from 'lucide-react';

interface Citation { index: number; source_id?: string; title?: string; kind?: string; snippet?: string; date?: string; }
interface Msg { id?: string; role: 'user' | 'assistant'; content: string; confidence?: number; citations?: Citation[]; suggested_action?: string; }

const SUGGESTIONS = [
  'Why did we change our pricing strategy?',
  'What have we promised to the Acme client?',
  'Who approves refunds above $500?',
  'What decisions were made about Project Atlas?',
  'Which clients are currently at risk?',
  'What knowledge would be lost if a key employee left?',
];

export default function AskDecisionOSPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const ensureConversation = async () => {
    if (conversationId || !user || !workspace) return conversationId;
    const { data } = await supabase.from('conversations').insert({ workspace_id: workspace.id, user_id: user.id, title: 'New conversation' }).select().single();
    if (data) setConversationId(data.id);
    return data?.id ?? null;
  };

  const ask = async (q: string) => {
    if (!q.trim() || !workspace || loading) return;
    setLoading(true);
    const userMsg: Msg = { role: 'user', content: q };
    setMessages((m) => [...m, userMsg]);
    setInput('');

    const cid = await ensureConversation();
    if (cid) await supabase.from('conversation_messages').insert({ conversation_id: cid, role: 'user', content: q });

    try {
      const { data, error } = await supabase.functions.invoke('ask-decisionos', {
        body: { question: q, workspace_id: workspace.id, conversation_id: cid, history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.detail || data.error);

      const asstMsg: Msg = {
        role: 'assistant',
        content: data.answer,
        confidence: data.confidence,
        citations: data.citations,
        suggested_action: data.suggested_action,
      };

      let savedId: string | undefined;
      if (cid) {
        const { data: saved } = await supabase.from('conversation_messages').insert({
          conversation_id: cid, role: 'assistant', content: data.answer,
          confidence: data.confidence, citations: data.citations, suggested_action: data.suggested_action,
        }).select().single();
        savedId = saved?.id;
      }
      setMessages((m) => [...m, { ...asstMsg, id: savedId }]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'Failed to get answer', variant: 'destructive' });
      setMessages((m) => m.slice(0, -1));
    } finally { setLoading(false); }
  };

  const feedback = async (msg: Msg, rating: 'correct' | 'partial' | 'incorrect') => {
    if (!msg.id || !workspace || !user) return;
    await supabase.from('answer_feedback').insert({ message_id: msg.id, workspace_id: workspace.id, user_id: user.id, rating });
    toast({ title: 'Thanks', description: 'Feedback recorded.' });
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Ask DecisionOS</h1>
        </div>
        <p className="text-sm text-muted-foreground">Ask anything about your company. Answers cite the source and respect your permissions.</p>
      </div>

      <div className="flex-1 overflow-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/40 text-sm transition">
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            {m.role === 'user' ? (
              <div className="max-w-[80%] p-3 rounded-2xl bg-primary text-primary-foreground text-sm">{m.content}</div>
            ) : (
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>DecisionOS</span>
                  {typeof m.confidence === 'number' && (
                    <Badge variant="outline" className="ml-auto text-[10px]">confidence {(m.confidence * 100).toFixed(0)}%</Badge>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                {m.citations && m.citations.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sources</div>
                    {m.citations.map((c) => (
                      <div key={c.index} className="text-xs p-2 rounded-md bg-muted/40 border border-border flex gap-2">
                        <div className="font-mono text-primary shrink-0">[{c.index}]</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {c.kind === 'decision' ? <GitBranch className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            <span className="font-medium truncate">{c.title}</span>
                          </div>
                          {c.snippet && <div className="text-muted-foreground mt-0.5 line-clamp-2">{c.snippet}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {m.suggested_action && (
                  <div className="text-xs p-2 rounded-md bg-primary/5 border border-primary/20 flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 text-primary mt-0.5" />
                    <span><span className="font-medium">Suggested next: </span>{m.suggested_action}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => feedback(m, 'correct')}><ThumbsUp className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => feedback(m, 'partial')}><Meh className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => feedback(m, 'incorrect')}><ThumbsDown className="h-3 w-3" /></Button>
                </div>
              </Card>
            )}
          </div>
        ))}
        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking...</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="mt-4 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          placeholder="Ask about a decision, client, process, or policy..."
          className="min-h-[60px] resize-none"
          disabled={loading}
        />
        <Button type="submit" disabled={!input.trim() || loading} size="icon" className="h-[60px] w-12">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
