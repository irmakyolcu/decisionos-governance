import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTable, logAudit } from '@/hooks/useGovernance';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardCheck, Calendar, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

export default function PostDecisionReviewsPage() {
  const { rows: reviews, refetch } = useTable<any>('decision_reviews');
  const { rows: decisions } = useTable<any>('decisions');
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState<any>({ decision_id: '', scheduled_for: '', expected_outcome: '' });

  const decisionTitle = (id: string) => decisions.find((d) => d.id === id)?.title || id?.slice(0, 8);
  const upcoming = useMemo(() => reviews.filter((r) => !r.completed_at), [reviews]);
  const completed = useMemo(() => reviews.filter((r) => r.completed_at), [reviews]);

  async function schedule() {
    if (!workspace || !form.decision_id) return;
    const { error } = await db.from('decision_reviews').insert({
      workspace_id: workspace.id, decision_id: form.decision_id,
      scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
      expected_outcome: form.expected_outcome,
      reviewer_id: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    await logAudit(workspace.id, 'review.scheduled', { decision_id: form.decision_id, actor_user_id: user?.id });
    toast.success('Review scheduled'); setOpen(false);
    setForm({ decision_id: '', scheduled_for: '', expected_outcome: '' });
    refetch();
  }

  async function saveReview(r: any) {
    if (!workspace) return;
    const lessons = (r._lessons || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
    await db.from('decision_reviews').update({
      actual_outcome: r.actual_outcome, delta_summary: r.delta_summary,
      lessons, rating: r.rating, completed_at: new Date().toISOString(),
    }).eq('id', r.id);
    await logAudit(workspace.id, 'review.completed', { decision_id: r.decision_id, actor_user_id: user?.id });
    toast.success('Review completed'); setEdit(null); refetch();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ClipboardCheck className="h-7 w-7" /> Post-Decision Reviews</h1>
          <p className="text-muted-foreground mt-1">Compare expected vs actual. Lessons feed the Twin's learning pipeline.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Schedule Review</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule a post-decision review</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Decision</Label>
                <Select value={form.decision_id} onValueChange={(v) => setForm({...form, decision_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select a decision" /></SelectTrigger>
                  <SelectContent>{decisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Review date</Label><Input type="date" value={form.scheduled_for} onChange={(e) => setForm({...form, scheduled_for: e.target.value})} /></div>
              <div><Label>Expected outcome</Label><Textarea value={form.expected_outcome} onChange={(e) => setForm({...form, expected_outcome: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={schedule} disabled={!form.decision_id}>Schedule</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <Card><CardContent className="p-0"><ul className="divide-y">
            {upcoming.length === 0 && <li className="p-6 text-sm text-muted-foreground">No reviews scheduled.</li>}
            {upcoming.map((r) => (
              <li key={r.id} className="p-4 flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{decisionTitle(r.decision_id)}</p>
                  <p className="text-xs text-muted-foreground">Due {r.scheduled_for ? new Date(r.scheduled_for).toLocaleDateString() : '—'}</p>
                  {r.expected_outcome && <p className="text-xs mt-1"><strong>Expected:</strong> {r.expected_outcome}</p>}
                </div>
                <Button size="sm" onClick={() => setEdit({ ...r, _lessons: (r.lessons || []).join('\n') })}>Complete</Button>
              </li>
            ))}
          </ul></CardContent></Card>
        </TabsContent>
        <TabsContent value="completed">
          <div className="space-y-3">
            {completed.length === 0 && <p className="text-sm text-muted-foreground">No reviews completed yet.</p>}
            {completed.map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{decisionTitle(r.decision_id)}</CardTitle>
                    {r.rating && <Stars n={r.rating} />}
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div><span className="text-xs text-muted-foreground">Expected</span><p>{r.expected_outcome || '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Actual</span><p>{r.actual_outcome || '—'}</p></div>
                  </div>
                  {r.delta_summary && <p><strong>Delta:</strong> {r.delta_summary}</p>}
                  {r.lessons?.length > 0 && (
                    <div><span className="text-xs text-muted-foreground">Lessons</span>
                      <ul className="list-disc pl-5">{r.lessons.map((l: string, i: number) => <li key={i}>{l}</li>)}</ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete review</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Actual outcome</Label><Textarea value={edit.actual_outcome || ''} onChange={(e) => setEdit({...edit, actual_outcome: e.target.value})} /></div>
              <div><Label>Delta vs expected</Label><Textarea value={edit.delta_summary || ''} onChange={(e) => setEdit({...edit, delta_summary: e.target.value})} /></div>
              <div><Label>Lessons (one per line)</Label><Textarea value={edit._lessons || ''} onChange={(e) => setEdit({...edit, _lessons: e.target.value})} rows={4} /></div>
              <div><Label>Rating</Label>
                <div className="flex gap-1 mt-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setEdit({...edit, rating: n})}>
                      <Star className={`h-6 w-6 ${(edit.rating || 0) >= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => saveReview(edit)}>Save review</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return <div className="flex">{Array.from({ length: 5 }).map((_, i) => (
    <Star key={i} className={`h-4 w-4 ${i < n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
  ))}</div>;
}
