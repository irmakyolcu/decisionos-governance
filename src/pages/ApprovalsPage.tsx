import { useState } from 'react';
import { useDecisions } from '@/hooks/useDecisions';
import { authorityLimits } from '@/data/mockData';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Decision } from '@/types/decision';
import { usePermissions } from '@/lib/permissions';
import { ReadOnlyNotice } from '@/components/PermissionGate';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function ApprovalsPage() {
  const { decisions, loading, approveDecision, updateStatus } = useDecisions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pendingDecisions = decisions.filter(d => ['Under Review', 'Escalated', 'Pending'].includes(d.status));
  const { can, isViewer } = usePermissions();
  const canApprove = can('approveDecision');
  const { toast } = useToast();

  const ceoLimit = authorityLimits.find(a => a.role === 'CEO')!;
  const exceedsAuthority = (d: Decision) => d.budget > ceoLimit.maxBudget;

  const selected = pendingDecisions.find(d => d.id === selectedId) ?? pendingDecisions[0];

  const handleApprove = async () => {
    if (!selected) return;
    try { await approveDecision(selected.id); toast({ title: 'Karar onaylandı' }); }
    catch (e: any) { toast({ title: 'Onaylanamadı', description: e.message, variant: 'destructive' }); }
  };
  const handleReject = async () => {
    if (!selected) return;
    try { await updateStatus(selected.id, 'Rejected'); toast({ title: 'Reddedildi' }); }
    catch (e: any) { toast({ title: 'Hata', description: e.message, variant: 'destructive' }); }
  };
  const handleEscalate = async () => {
    if (!selected) return;
    try { await updateStatus(selected.id, 'Escalated'); toast({ title: 'Board\'a yükseltildi' }); }
    catch (e: any) { toast({ title: 'Hata', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">CEO Approval Gate</h1>
        <p className="page-description">No decision can be executed without CEO approval. Review and act on pending decisions.</p>
      </div>

      {isViewer && (
        <div className="mb-4">
          <ReadOnlyNotice message="Viewer rolündesiniz: kararları görüntüleyebilir ancak onaylayamazsınız." />
        </div>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="enterprise-card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm text-foreground">Pending Decisions ({pendingDecisions.length})</h3>
            </div>
            <div className="divide-y divide-border/50">
              {pendingDecisions.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Onay bekleyen karar yok.</p>
              ) : pendingDecisions.map((d) => (
                <button key={d.id} onClick={() => setSelectedId(d.id)} className={`w-full text-left p-4 hover:bg-muted/30 transition-colors ${selected?.id === d.id ? 'bg-accent' : ''}`}>
                  <p className="font-medium text-sm text-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">€{d.budget.toLocaleString()}</p>
                  <div className="flex gap-2 mt-2">
                    <StatusBadge status={d.status} />
                    {exceedsAuthority(d) && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Exceeds CEO limit</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="lg:col-span-2 space-y-6">
              <div className="enterprise-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">{selected.title}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div><span className="text-muted-foreground">Budget:</span> <span className="font-mono font-medium text-foreground">€{selected.budget.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Risk:</span> <RiskBadge level={selected.riskLevel} /></div>
                  <div><span className="text-muted-foreground">Submitted by:</span> <span className="text-foreground">{selected.createdBy.name}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selected.status} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-success/5 rounded-lg p-3">
                    <p className="text-xs font-medium text-success mb-2">Pros ({selected.pros.length})</p>
                    {selected.pros.map(p => <p key={p.id} className="text-xs text-muted-foreground mb-1">• {p.description}</p>)}
                  </div>
                  <div className="bg-destructive/5 rounded-lg p-3">
                    <p className="text-xs font-medium text-destructive mb-2">Cons ({selected.cons.length})</p>
                    {selected.cons.map(c => <p key={c.id} className="text-xs text-muted-foreground mb-1">• {c.description}</p>)}
                  </div>
                </div>

                {selected.aiEvaluation && (
                  <div className="mt-4 bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-foreground mb-1">AI Evaluation</p>
                    <p className="text-xs text-muted-foreground">{selected.aiEvaluation.summary.substring(0, 200)}…</p>
                  </div>
                )}
              </div>

              {exceedsAuthority(selected) && (
                <div className="enterprise-card p-6 border-warning border-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Authority Limit Exceeded</p>
                      <p className="text-sm text-muted-foreground mt-1">This decision exceeds the CEO authorization limit (€5M) and must be escalated to the Board.</p>
                      {canApprove && (
                        <button onClick={handleEscalate} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-warning text-warning-foreground hover:opacity-90 transition-opacity">
                          <Shield className="h-4 w-4 inline mr-1" /> Escalate to Board
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!exceedsAuthority(selected) && (
                <div className="enterprise-card p-6">
                  <p className="text-sm text-muted-foreground mb-4">Execution remains locked until CEO approval.</p>
                  {canApprove ? (
                    <div className="flex gap-3 flex-wrap">
                      <button onClick={handleApprove} className="px-4 py-2 rounded-lg text-sm font-medium gradient-primary text-primary-foreground hover:opacity-90"><CheckCircle className="h-4 w-4 inline mr-1" /> Approve</button>
                      <button onClick={handleReject} className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20"><XCircle className="h-4 w-4 inline mr-1" /> Reject</button>
                    </div>
                  ) : (
                    <ReadOnlyNotice message="Bu kararı onaylama yetkiniz yok. Sadece Admin ve Approver onaylayabilir." />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center enterprise-card p-12">
              <p className="text-muted-foreground text-sm">Select a decision to review</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
