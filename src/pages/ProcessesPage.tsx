import { RecordLinks } from '@/components/RecordLinks';
import { useLanguage, translate } from "@/contexts/LanguageContext";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Workflow, AlertCircle, Link2, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Relation = 'next_step' | 'depends_on' | 'subprocess' | 'related';

const RELATION_LABELS: Record<Relation, string> = {
  next_step: 'Sonraki adım',
  depends_on: 'Bağımlı',
  subprocess: 'Alt süreç',
  related: 'İlgili',
};

interface ProcessLink {
  id: string;
  from_process_id: string;
  to_process_id: string;
  relation: Relation;
  note: string | null;
}

export default function ProcessesPage() {
  useLanguage();
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [links, setLinks] = useState<ProcessLink[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', purpose: '', department: '', steps: '', owner_id: '' });
  const [members, setMembers] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [linkFor, setLinkFor] = useState<any | null>(null);
  const [linkForm, setLinkForm] = useState<{ to: string; relation: Relation; note: string }>({
    to: '',
    relation: 'next_step',
    note: '',
  });

  const load = async () => {
    if (!workspace) return;
    const [procR, memR, linkR] = await Promise.all([
      supabase.from('processes').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
      supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspace.id),
      supabase.from('process_links').select('*').eq('workspace_id', workspace.id),
    ]);
    const ids = (memR.data ?? []).map(m => m.user_id);
    const profiles = ids.length ? await supabase.from('profiles').select('user_id,display_name').in('user_id', ids) : { data: [], error: null };
    const failure = procR.error ?? memR.error ?? linkR.error ?? profiles.error;
    if (failure) toast({ title: translate('Error'), description: failure.message, variant: 'destructive' });
    setRows(procR.data ?? []);
    setMembers((memR.data ?? []).map(m => ({ user_id: m.user_id, display_name: profiles.data?.find(p => p.user_id === m.user_id)?.display_name ?? null })));
    setLinks((linkR.data as ProcessLink[]) ?? []);
  };

  const memberName = (id: string | null) =>
    (id && members.find((m) => m.user_id === id)?.display_name) || (id ? 'Unknown user' : null);

  const processName = (id: string) => rows.find((r) => r.id === id)?.name ?? 'Bilinmeyen süreç';

  const setOwner = async (processId: string, ownerId: string | null) => {
    const { error } = await supabase.from('processes').update({ owner_id: ownerId }).eq('id', processId);
    if (error) return toast({ title: translate("Error"), description: error.message, variant: 'destructive' });
    toast({ title: ownerId ? 'Owner assigned' : 'Owner removed' });
    load();
  };
  useEffect(() => { load(); }, [workspace]);

  const create = async () => {
    if (!workspace || !user || !form.name) return;
    const steps = form.steps.split('\n').filter(Boolean).map((s, i) => ({ order: i + 1, title: s }));
    const { error } = await supabase.from('processes').insert({
      workspace_id: workspace.id, created_by: user.id,
      name: form.name, purpose: form.purpose, department: form.department, steps,
      owner_id: form.owner_id || null,
    });
    if (error) return toast({ title: translate("Error"), description: error.message, variant: 'destructive' });
    setOpen(false); setForm({ name: '', purpose: '', department: '', steps: '', owner_id: '' }); load();
  };

  const createLink = async () => {
    if (!workspace || !user || !linkFor || !linkForm.to) return;
    const { error } = await supabase.from('process_links').insert({
      workspace_id: workspace.id,
      created_by: user.id,
      from_process_id: linkFor.id,
      to_process_id: linkForm.to,
      relation: linkForm.relation,
      note: linkForm.note || null,
    });
    if (error) return toast({ title: translate("Bağlantı eklenemedi"), description: error.message, variant: 'destructive' });
    toast({ title: translate("Bağlantı eklendi") });
    setLinkForm({ to: '', relation: 'next_step', note: '' });
    setLinkFor(null);
    load();
  };

  const removeLink = async (id: string) => {
    const { error } = await supabase.from('process_links').delete().eq('id', id);
    if (error) return toast({ title: translate("Error"), description: error.message, variant: 'destructive' });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{translate("Processes")}</h1><p className="text-sm text-muted-foreground">{translate("Company process library.")}</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{translate("New Process")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{translate("New Process")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{translate("Name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>{translate("Purpose")}</Label><Textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
              <div><Label>{translate("Department")}</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div>
                <Label>{translate("Owner")}</Label>
                <Select value={form.owner_id || 'none'} onValueChange={(v) => setForm({ ...form, owner_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder={translate("Unassigned")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{translate("Unassigned")}</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.display_name || m.user_id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{translate("Steps (one per line)")}</Label><Textarea rows={5} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} /></div>
              <Button onClick={create} className="w-full">{translate("Create")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <Card className="p-12 text-center"><Workflow className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">{translate("No processes yet.")}</p></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const unowned = !p.owner_id;
            const stale = !p.last_verified_at;
            const outgoing = links.filter((l) => l.from_process_id === p.id);
            const incoming = links.filter((l) => l.to_process_id === p.id);
            return (
              <Card id={`record-${p.id}`} key={p.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    {p.department && <div className="text-xs text-muted-foreground">{p.department}</div>}
                  </div>
                  <div className="flex gap-1 items-center">
                    {unowned && <Badge variant="destructive" className="text-[10px]"><AlertCircle className="h-2.5 w-2.5 mr-1" />{translate("No owner")}</Badge>}
                    {stale && <Badge variant="secondary" className="text-[10px]">{translate("Not verified")}</Badge>}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => { setLinkFor(p); setLinkForm({ to: '', relation: 'next_step', note: '' }); }}
                    >
                      <Link2 className="h-3 w-3 mr-1" />{translate("Bağla")}
                    </Button>
                  </div>
                </div>
                {p.purpose && <p className="text-sm text-muted-foreground mb-2">{p.purpose}</p>}
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-xs text-muted-foreground">{translate("Owner")}</Label>
                  <Select value={p.owner_id ?? 'none'} onValueChange={(v) => setOwner(p.id, v === 'none' ? null : v)}>
                    <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder={translate("Unassigned")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{translate("Unassigned")}</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.display_name || m.user_id.slice(0, 8)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {p.owner_id && !members.some((m) => m.user_id === p.owner_id) && (
                    <span className="text-xs text-muted-foreground">{memberName(p.owner_id)}</span>
                  )}
                </div>

                {(outgoing.length > 0 || incoming.length > 0) && (
                  <div className="mb-2 space-y-1 rounded-md border border-border/60 p-2">
                    {outgoing.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 text-xs">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="secondary" className="text-[10px]">{RELATION_LABELS[l.relation]}</Badge>
                        <span>{processName(l.to_process_id)}</span>
                        {l.note && <span className="text-muted-foreground">— {l.note}</span>}
                        <button onClick={() => removeLink(l.id)} className="ml-auto text-muted-foreground hover:text-destructive" aria-label={translate("Bağlantıyı kaldır")}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {incoming.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ArrowLeft className="h-3 w-3" />
                        <Badge variant="outline" className="text-[10px]">{RELATION_LABELS[l.relation]}</Badge>
                        <span>{processName(l.from_process_id)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {Array.isArray(p.steps) && p.steps.length > 0 && (
                  <ol className="text-xs space-y-1 pl-4 list-decimal text-muted-foreground">
                    {p.steps.map((s: any, i: number) => <li id={`record-${s.id}`} key={s.id??i}>{s.title || s}{s.id&&<RecordLinks kind="step" id={s.id}/>}</li>)}
                  </ol>
                )}
              <RecordLinks kind="process" id={p.id}/>
</Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!linkFor} onOpenChange={(o) => !o && setLinkFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{translate("Süreç bağla:")} {linkFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{translate("Hedef süreç")}</Label>
              <Select value={linkForm.to} onValueChange={(v) => setLinkForm({ ...linkForm, to: v })}>
                <SelectTrigger><SelectValue placeholder={translate("Süreç seçin")} /></SelectTrigger>
                <SelectContent>
                  {rows.filter((r) => r.id !== linkFor?.id).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{translate("İlişki türü")}</Label>
              <Select value={linkForm.relation} onValueChange={(v) => setLinkForm({ ...linkForm, relation: v as Relation })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RELATION_LABELS) as Relation[]).map((k) => (
                    <SelectItem key={k} value={k}>{RELATION_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{translate("Not (opsiyonel)")}</Label><Input value={linkForm.note} onChange={(e) => setLinkForm({ ...linkForm, note: e.target.value })} /></div>
            <Button onClick={createLink} disabled={!linkForm.to} className="w-full">{translate("Bağlantıyı kaydet")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
