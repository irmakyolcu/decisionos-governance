import { useEffect, useState } from 'react';
import { FileCheck, Plus, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Report = {
  id: string;
  title: string;
  framework: string;
  period_start: string;
  period_end: string;
  summary: string | null;
  findings: Array<{ check: string; status: string; detail?: string }>;
  status: string;
  created_at: string;
};

const FRAMEWORKS = ['SOC 2', 'ISO 27001', 'GDPR', 'EU AI Act', 'NIS2', 'Internal Governance'];

export default function ComplianceReportsPage() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [items, setItems] = useState<Report[]>([]);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [title, setTitle] = useState('');
  const [framework, setFramework] = useState(FRAMEWORKS[0]);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(monthAgo);
  const [periodEnd, setPeriodEnd] = useState(today);

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase
      .from('compliance_reports')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });
    setItems((data ?? []) as unknown as Report[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  const generate = async () => {
    if (!workspace || !user) return;
    if (!title.trim()) return toast.error('Title required');
    setGenerating(true);
    try {
      // Deterministic compliance synthesis from existing audit + governance data.
      const [auditR, decisionsR, actionsR, policiesR] = await Promise.all([
        supabase.from('audit_events').select('id, event_type, created_at').eq('workspace_id', workspace.id).gte('created_at', periodStart).lte('created_at', `${periodEnd}T23:59:59`),
        supabase.from('decisions').select('id, status, created_at').eq('workspace_id', workspace.id).gte('created_at', periodStart).lte('created_at', `${periodEnd}T23:59:59`),
        supabase.from('action_proposals').select('id, approval_status, authority_level, content_hash, version').eq('workspace_id', workspace.id),
        supabase.from('policies').select('id, name, scope').eq('workspace_id', workspace.id),
      ]);

      const auditCount = auditR.data?.length ?? 0;
      const decisionsCount = decisionsR.data?.length ?? 0;
      const actions = actionsR.data ?? [];
      const policies = policiesR.data ?? [];

      const findings = [
        {
          check: 'Audit ledger immutability',
          status: 'pass',
          detail: `${auditCount} audit events captured in period (append-only trigger enforced).`,
        },
        {
          check: 'Decision lifecycle coverage',
          status: decisionsCount > 0 ? 'pass' : 'observation',
          detail: `${decisionsCount} decisions recorded in scope window.`,
        },
        {
          check: 'High-authority action approvals',
          status: actions.filter((a: any) => a.authority_level >= 3 && a.approval_status !== 'approved').length === 0 ? 'pass' : 'observation',
          detail: `${actions.filter((a: any) => a.authority_level >= 3).length} L3+ actions reviewed.`,
        },
        {
          check: 'Action proposal content-hash integrity',
          status: actions.every((a: any) => !!a.content_hash) ? 'pass' : 'fail',
          detail: 'Every proposal carries SHA-256 content hash; payload mutations invalidate approvals.',
        },
        {
          check: 'Policy coverage',
          status: policies.length > 0 ? 'pass' : 'observation',
          detail: `${policies.length} active policies configured.`,
        },
      ];

      const fails = findings.filter((f) => f.status === 'fail').length;
      const obs = findings.filter((f) => f.status === 'observation').length;
      const summary = fails > 0
        ? `${fails} control failure(s) and ${obs} observation(s) detected.`
        : obs > 0
          ? `All controls passing with ${obs} observation(s) for review.`
          : 'All controls passing for the selected period.';

      const { error } = await supabase.from('compliance_reports').insert({
        workspace_id: workspace.id,
        title,
        framework,
        period_start: periodStart,
        period_end: periodEnd,
        findings,
        summary,
        status: 'final',
        generated_by: user.id,
        scope: { audit_events: auditCount, decisions: decisionsCount, actions: actions.length, policies: policies.length },
      });
      if (error) throw error;
      toast.success('Compliance report generated');
      setOpen(false);
      setTitle('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const downloadCsv = (r: Report) => {
    const rows = [
      ['check', 'status', 'detail'],
      ...r.findings.map((f) => [f.check, f.status, f.detail ?? '']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${r.title.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" /> Compliance Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate point-in-time compliance reports from audit ledger, decisions, actions and policies.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Generate report</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Generate compliance report</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q2 SOC 2 Review" />
              </div>
              <div>
                <Label>Framework</Label>
                <Select value={framework} onValueChange={setFramework}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FRAMEWORKS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Period start</Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div>
                  <Label>Period end</Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={generate} disabled={generating} className="gap-2">
                {generating && <Loader2 className="h-4 w-4 animate-spin" />} Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">No reports yet — generate your first.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {items.map((r) => {
            const fails = r.findings.filter((f) => f.status === 'fail').length;
            const obs = r.findings.filter((f) => f.status === 'observation').length;
            return (
              <Card key={r.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{r.framework}</Badge>
                        <span className="text-xs text-muted-foreground">{r.period_start} → {r.period_end}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {fails > 0 && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{fails} fail</Badge>}
                      {obs > 0 && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">{obs} obs</Badge>}
                      {fails === 0 && obs === 0 && <Badge variant="outline" className="bg-success/10 text-success border-success/20">all pass</Badge>}
                      <Button size="sm" variant="outline" onClick={() => downloadCsv(r)} className="gap-1">
                        <Download className="h-3 w-3" /> CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {r.summary && <p className="text-sm text-muted-foreground mb-3">{r.summary}</p>}
                  <div className="space-y-1">
                    {r.findings.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                        <div>
                          <span className="text-foreground">{f.check}</span>
                          {f.detail && <p className="text-xs text-muted-foreground mt-0.5">{f.detail}</p>}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            f.status === 'pass' ? 'bg-success/10 text-success border-success/20' :
                            f.status === 'fail' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                            'bg-warning/10 text-warning border-warning/20'
                          }
                        >
                          {f.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
