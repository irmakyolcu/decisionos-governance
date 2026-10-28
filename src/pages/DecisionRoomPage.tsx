import { useLanguage, translate, getLocale } from "@/contexts/LanguageContext";
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { logAudit } from '@/hooks/useGovernance';
import { RiskBadge, AuthorityLevelBadge } from '@/components/governance/StatusBadges';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, ShieldCheck, AlertOctagon, CheckCircle } from 'lucide-react';

const db = supabase as any;

export default function DecisionRoomPage() {
  useLanguage();
  const { id } = useParams();
  const nav = useNavigate();
  const { workspace, role } = useWorkspace();
  const [decision, setDecision] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [assumptions, setAssumptions] = useState<any[]>([]);
  const [unknowns, setUnknowns] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  async function load() {
    if (!id) return;
    const [d, a, ev, as_, un, rec, sc] = await Promise.all([
      db.from('decisions').select('*').eq('id', id).maybeSingle(),
      db.from('decision_alternatives').select('*').eq('decision_id', id),
      db.from('decision_evidence').select('*').eq('decision_id', id),
      db.from('decision_assumptions').select('*').eq('decision_id', id),
      db.from('decision_unknowns').select('*').eq('decision_id', id),
      db.from('decision_recommendations').select('*').eq('decision_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('decision_scenarios').select('*').eq('decision_id', id),
    ]);
    const current = rec.data?.analysis_snapshot_id;
    const latest = (rows: any[]) => rows.filter(r => !r.analysis_snapshot_id || r.analysis_snapshot_id === current);
    setDecision(d.data); setAlternatives(latest(a.data || [])); setEvidence(ev.data || []);
    setAssumptions(latest(as_.data || [])); setUnknowns(latest(un.data || []));
    setRecommendation(rec.data); setScenarios(latest(sc.data || []));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function runAnalysis() {
    if (!decision || !workspace) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('decision-analyze', {
        body: { decision_id: id, workspace_id: workspace.id },
      });
      if (error) throw error;
      await logAudit(workspace.id, 'agent.analysis_generated', { decision_id: id, model: data?.model });
      toast.success('Analysis complete');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Analysis failed');
    } finally { setAnalyzing(false); }
  }

  async function approveDecision() {
    if (!decision || !workspace) return;
    await db.from('decisions').update({ status: 'Approved' }).eq('id', decision.id);
    await logAudit(workspace.id, 'decision.approved', { decision_id: decision.id, reason: 'Approved in Decision Room' });
    toast.success('Decision approved. Execution still requires separate authorization.');
    load();
  }

  if (!decision) return <div className="p-6"><p>{translate("Loading…")}</p></div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav('/decisions/list')}><ArrowLeft className="h-4 w-4 mr-1" /> {translate("All decisions")}</Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="outline">{translate(decision.status)}</Badge>
          <h1 className="text-3xl font-bold tracking-tight mt-2">{decision.title}</h1>
          <p className="text-muted-foreground mt-1">{decision.description}</p>
          <div className="flex gap-2 mt-3">
            <RiskBadge level={decision.risk_level} />
            {decision.budget && <Badge variant="outline">€{Number(decision.budget).toLocaleString(getLocale())}</Badge>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={runAnalysis} disabled={analyzing || !['admin','approver'].includes(role ?? '')}>
            <Sparkles className="h-4 w-4 mr-2" />{analyzing ? translate("Analyzing…") : translate("Run AI Analysis")}
          </Button>
          {['admin','approver'].includes(role ?? '') && decision.status !== 'Approved' && (
            <Button onClick={approveDecision}><CheckCircle className="h-4 w-4 mr-2" />{translate("Approve Decision")}</Button>
          )}
        </div>
      </div>

      <Card className="bg-blue-500/5 border-blue-500/30">
        <CardContent className="pt-4 text-sm flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5" />
          <p>{translate("Approving the decision authorizes the chosen option only. Each execution action must still be reviewed in the")} <button className="underline" onClick={() => nav('/approvals-center')}>{translate("Approval Center")}</button>.</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary">
        <TabsList className="grid grid-cols-4 md:grid-cols-7">
          <TabsTrigger value="summary">{translate("Summary")}</TabsTrigger>
          <TabsTrigger value="evidence">{translate("Evidence (")}{evidence.length})</TabsTrigger>
          <TabsTrigger value="fau">{translate("Facts / Assumptions / Unknowns")}</TabsTrigger>
          <TabsTrigger value="alts">{translate("Alternatives (")}{alternatives.length})</TabsTrigger>
          <TabsTrigger value="rec">{translate("AI Recommendation")}</TabsTrigger>
          <TabsTrigger value="da">{translate("Devil's Advocate")}</TabsTrigger>
          <TabsTrigger value="sc">{translate("Scenarios (")}{scenarios.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card><CardContent className="pt-6 text-sm space-y-2">
            <p><strong>{translate("Problem:")}</strong> {decision.problem_statement || '—'}</p>
            <p><strong>{translate("Type:")}</strong> {decision.decision_type || '—'}</p>
            <p><strong>{translate("Strategic importance:")}</strong> {decision.strategic_importance || '—'}</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="evidence">
          <Card><CardContent className="pt-6">
            {evidence.length === 0 ? <p className="text-sm text-muted-foreground">{translate("No evidence recorded. Run AI analysis to collect evidence.")}</p> : (
              <ul className="divide-y">{evidence.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex items-center gap-2"><strong>{e.source}</strong>
                    <Badge variant={e.is_verified ? 'default' : 'outline'}>{e.is_verified ? 'verified' : 'unverified'}</Badge>
                    <Badge variant="outline">{e.reliability}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{e.summary}</p>
                  {e.supports && <p className="text-xs text-emerald-600">{translate("Supports:")} {e.supports}</p>}
                  {e.contradicts && <p className="text-xs text-red-600">{translate("Contradicts:")} {e.contradicts}</p>}
                </li>
              ))}</ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="fau">
          <div className="grid md:grid-cols-3 gap-3">
            <Card><CardHeader><CardTitle className="text-sm text-emerald-600">{translate("Verified Facts")}</CardTitle></CardHeader><CardContent>
              {evidence.filter(e=>e.is_verified).length === 0 ? <p className="text-sm text-muted-foreground">{translate("None.")}</p> :
                <ul className="space-y-1 text-sm">{evidence.filter(e=>e.is_verified).map(e => <li key={e.id}>· {e.summary || e.source}</li>)}</ul>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm text-amber-600">{translate("Assumptions")}</CardTitle></CardHeader><CardContent>
              {assumptions.length === 0 ? <p className="text-sm text-muted-foreground">{translate("None.")}</p> :
                <ul className="space-y-1 text-sm">{assumptions.map(a => <li key={a.id}>· {a.text}</li>)}</ul>}
            </CardContent></Card>
            <Card className="border-red-500/30"><CardHeader><CardTitle className="text-sm text-red-600 flex items-center gap-1"><AlertOctagon className="h-4 w-4" />{translate("Unknowns")}</CardTitle></CardHeader><CardContent>
              {unknowns.length === 0 ? <p className="text-sm text-muted-foreground">{translate("None.")}</p> :
                <ul className="space-y-1 text-sm">{unknowns.map(u => <li key={u.id}>· {u.text} {u.is_blocking && <Badge variant="destructive" className="text-[10px]">{translate("blocking")}</Badge>}</li>)}</ul>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="alts">
          <Card><CardContent className="pt-6">
            {alternatives.length === 0 ? <p className="text-sm text-muted-foreground">{translate("No alternatives. Run AI analysis.")}</p> : (
              <ul className="space-y-3">{alternatives.map((a) => (
                <li key={a.id} className={`p-4 rounded-lg border ${a.is_recommended ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="flex items-center gap-2">
                    <strong>{a.title}</strong>
                    {a.is_recommended && <Badge>{translate("Recommended")}</Badge>}
                    <RiskBadge level={a.risk_level} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                  <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
                    <div><span className="text-muted-foreground">{translate("Cost")}</span><p className="font-medium">€{Number(a.estimated_cost || 0).toLocaleString(getLocale())}</p></div>
                    <div><span className="text-muted-foreground">{translate("Value")}</span><p className="font-medium">€{Number(a.expected_value || 0).toLocaleString(getLocale())}</p></div>
                    <div><span className="text-muted-foreground">{translate("Time to impact")}</span><p className="font-medium">{a.time_to_impact || '—'}</p></div>
                    <div><span className="text-muted-foreground">{translate("Confidence")}</span><p className="font-medium">{Math.round((a.confidence || 0) * 100)}%</p></div>
                  </div>
                </li>
              ))}</ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="rec">
          <Card><CardContent className="pt-6">
            {!recommendation ? <p className="text-sm text-muted-foreground">{translate("Run AI analysis to generate a recommendation.")}</p> : (
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><strong>{translate("AI Recommendation")}</strong>
                  <Badge variant="outline">{translate("confidence")} {Math.round((recommendation.confidence || 0) * 100)}%</Badge>
                </div>
                <p className="text-sm">{recommendation.rationale}</p>
                {recommendation.invalidation_conditions && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/30 rounded text-xs">
                    <strong>{translate("Would change if:")}</strong> {recommendation.invalidation_conditions}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Model: {recommendation.model || '—'} {translate("· This is a recommendation, not an objective fact.")}</p>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="da">
          <Card className="border-red-500/30"><CardContent className="pt-6">
            {!recommendation?.devils_advocate ? <p className="text-sm text-muted-foreground">{translate("No challenge generated yet.")}</p> :
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">{recommendation.devils_advocate}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="sc">
          <div className="grid md:grid-cols-2 gap-3">
            {scenarios.length === 0 ? <p className="text-sm text-muted-foreground col-span-2">{translate("No scenarios yet.")}</p> :
              scenarios.map((s) => (
                <Card key={s.id}><CardHeader><CardTitle className="text-sm capitalize">{s.scenario}</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>{s.summary}</p>
                    <p className="text-xs"><strong>{translate("Financial impact:")}</strong> {s.financial_impact == null ? '—' : `€${Number(s.financial_impact).toLocaleString(getLocale())}`}</p>
                    <p className="text-xs"><strong>{translate("Probability:")}</strong> {s.probability == null ? translate('integrity.unmeasured') : `${Math.round(s.probability * 100)}%`}</p>
                  </CardContent></Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
