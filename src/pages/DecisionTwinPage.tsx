import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useTable, logAudit } from '@/hooks/useGovernance';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Plus, Check, X, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

export default function DecisionTwinPage() {
  const { workspace, role } = useWorkspace();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const { rows: prefs, refetch: refetchPrefs } = useTable<any>('twin_preferences');
  const { rows: corrections, refetch: refetchCorr } = useTable<any>('twin_corrections');

  useEffect(() => {
    if (!workspace) return;
    db.from('twin_profiles').select('*').eq('workspace_id', workspace.id).maybeSingle().then(({ data }: any) => {
      if (data) setProfile(data);
      else setProfile({ workspace_id: workspace.id, twin_name: 'CEO Digital Twin', risk_appetite: 'balanced', communication_style: 'direct', decision_style: '', red_lines: '', notes: '' });
    });
  }, [workspace]);

  async function saveProfile() {
    if (!workspace || !profile) return;
    const payload = { ...profile, workspace_id: workspace.id };
    const { error } = await db.from('twin_profiles').upsert(payload, { onConflict: 'workspace_id' });
    if (error) { toast.error(error.message); return; }
    await logAudit(workspace.id, 'twin.profile_updated', { actor_user_id: user?.id });
    toast.success('Twin profile saved');
  }

  async function addPref(form: any) {
    if (!workspace) return;
    const { error } = await db.from('twin_preferences').insert({ workspace_id: workspace.id, ...form, created_by: user?.id });
    if (error) { toast.error(error.message); return; }
    refetchPrefs();
  }
  async function togglePref(p: any) {
    await db.from('twin_preferences').update({ active: !p.active }).eq('id', p.id);
    refetchPrefs();
  }
  async function delPref(id: string) {
    await db.from('twin_preferences').delete().eq('id', id);
    refetchPrefs();
  }

  async function reviewCorrection(c: any, status: 'approved' | 'rejected') {
    if (!workspace) return;
    await db.from('twin_corrections').update({ status, approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', c.id);
    await logAudit(workspace.id, `twin.learning_${status}`, { actor_user_id: user?.id, reason: c.proposed_learning });
    if (status === 'approved' && c.proposed_learning) {
      await db.from('twin_preferences').insert({
        workspace_id: workspace.id, category: 'learned', statement: c.proposed_learning, weight: 7, created_by: user?.id,
      });
      refetchPrefs();
    }
    refetchCorr();
    toast.success(`Learning update ${status}`);
  }

  if (!profile) return <div className="p-6">Loading…</div>;
  const pending = corrections.filter((c) => c.status === 'pending');
  const isAdmin = role === 'admin';

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Decision Twin</h1>
          <p className="text-muted-foreground">Your AI clone learns slowly, transparently, and only with human approval.</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="prefs">Preferences ({prefs.length})</TabsTrigger>
          <TabsTrigger value="learning">Learning Updates ({pending.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card><CardContent className="pt-6 grid md:grid-cols-2 gap-4">
            <div><Label>Twin name</Label><Input value={profile.twin_name} onChange={(e) => setProfile({...profile, twin_name: e.target.value})} /></div>
            <div><Label>Risk appetite</Label>
              <Select value={profile.risk_appetite} onValueChange={(v) => setProfile({...profile, risk_appetite: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['conservative','balanced','aggressive'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Communication style</Label>
              <Select value={profile.communication_style} onValueChange={(v) => setProfile({...profile, communication_style: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['direct','diplomatic','analytical','collaborative'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Decision style</Label><Input value={profile.decision_style || ''} onChange={(e) => setProfile({...profile, decision_style: e.target.value})} placeholder="data-driven, consensus, decisive…" /></div>
            <div className="md:col-span-2"><Label>Red lines (never recommend)</Label><Textarea value={profile.red_lines || ''} onChange={(e) => setProfile({...profile, red_lines: e.target.value})} rows={3} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Textarea value={profile.notes || ''} onChange={(e) => setProfile({...profile, notes: e.target.value})} rows={3} /></div>
            <div className="md:col-span-2 flex justify-end"><Button onClick={saveProfile}>Save Twin Profile</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="prefs">
          <PreferenceList prefs={prefs} onAdd={addPref} onToggle={togglePref} onDelete={delPref} />
        </TabsContent>

        <TabsContent value="learning">
          <Card><CardContent className="p-0">
            <ul className="divide-y">
              {corrections.length === 0 && <li className="p-6 text-sm text-muted-foreground">No learning updates yet. When you override the AI in the Decision Room, propose a learning update here.</li>}
              {corrections.map((c) => (
                <li key={c.id} className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <Badge variant={c.status === 'pending' ? 'outline' : c.status === 'approved' ? 'default' : 'destructive'}>{c.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm grid md:grid-cols-2 gap-3">
                    <div><span className="text-xs text-muted-foreground">AI recommended</span><p>{c.ai_recommendation}</p></div>
                    <div><span className="text-xs text-muted-foreground">Human chose</span><p>{c.human_choice}</p></div>
                  </div>
                  {c.reason && <p className="text-sm"><span className="text-xs text-muted-foreground">Reason:</span> {c.reason}</p>}
                  {c.proposed_learning && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded text-sm">
                      <strong>Proposed learning:</strong> {c.proposed_learning}
                    </div>
                  )}
                  {c.status === 'pending' && isAdmin && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => reviewCorrection(c, 'approved')}><Check className="h-3 w-3 mr-1" />Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => reviewCorrection(c, 'rejected')}><X className="h-3 w-3 mr-1" />Reject</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent></Card>
          <AddCorrection onAdd={async (form) => {
            if (!workspace || !user) return;
            await db.from('twin_corrections').insert({ workspace_id: workspace.id, ...form, created_by: user.id });
            await logAudit(workspace.id, 'twin.correction_recorded', { actor_user_id: user.id });
            refetchCorr();
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PreferenceList({ prefs, onAdd, onToggle, onDelete }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'strategy', statement: '', weight: 5 });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Preference rules</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New preference</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} /></div>
              <div><Label>Statement</Label><Textarea value={form.statement} onChange={(e) => setForm({...form, statement: e.target.value})} placeholder="Always prefer reversible decisions over irreversible ones." /></div>
              <div><Label>Weight (1-10)</Label><Input type="number" min={1} max={10} value={form.weight} onChange={(e) => setForm({...form, weight: Number(e.target.value)})} /></div>
            </div>
            <DialogFooter><Button onClick={() => { onAdd(form); setOpen(false); setForm({category:'strategy',statement:'',weight:5}); }} disabled={!form.statement.trim()}>Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {prefs.length === 0 && <li className="p-6 text-sm text-muted-foreground">No preferences yet.</li>}
          {prefs.map((p: any) => (
            <li key={p.id} className="p-4 flex items-center gap-3">
              <Badge variant="outline">{p.category}</Badge>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!p.active ? 'opacity-50 line-through' : ''}`}>{p.statement}</p>
                <p className="text-xs text-muted-foreground">weight {p.weight}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onToggle(p)}>{p.active ? 'Disable' : 'Enable'}</Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AddCorrection({ onAdd }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ai_recommendation: '', human_choice: '', reason: '', proposed_learning: '' });
  return (
    <div className="flex justify-end mt-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-1" />Record an override</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Record an override</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>AI recommended</Label><Textarea value={form.ai_recommendation} onChange={(e) => setForm({...form, ai_recommendation: e.target.value})} /></div>
            <div><Label>You chose</Label><Textarea value={form.human_choice} onChange={(e) => setForm({...form, human_choice: e.target.value})} /></div>
            <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} /></div>
            <div><Label>Proposed learning (optional)</Label><Textarea value={form.proposed_learning} onChange={(e) => setForm({...form, proposed_learning: e.target.value})} placeholder="e.g. 'Prefer in-house solutions over vendor contracts for under €50k.'" /></div>
          </div>
          <DialogFooter><Button onClick={() => { onAdd(form); setOpen(false); setForm({ai_recommendation:'',human_choice:'',reason:'',proposed_learning:''}); }}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
