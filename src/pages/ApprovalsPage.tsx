import { decisions, currentUser, authorityLimits } from '@/data/mockData';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { Shield, AlertTriangle, CheckCircle, XCircle, RotateCcw, Edit } from 'lucide-react';
import { useState } from 'react';
import { Decision } from '@/types/decision';

export default function ApprovalsPage() {
  const [selected, setSelected] = useState<Decision | null>(null);
  const pendingDecisions = decisions.filter(d => ['Under Review', 'Escalated', 'Pending'].includes(d.status));

  const ceoLimit = authorityLimits.find(a => a.role === 'CEO')!;
  const exceedsAuthority = (d: Decision) => d.budget > ceoLimit.maxBudget;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">CEO Approval Gate</h1>
        <p className="page-description">No decision can be executed without CEO approval. Review and act on pending decisions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="enterprise-card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm text-foreground">Pending Decisions ({pendingDecisions.length})</h3>
          </div>
          <div className="divide-y divide-border/50">
            {pendingDecisions.map((d) => (
              <button key={d.id} onClick={() => setSelected(d)} className={`w-full text-left p-4 hover:bg-muted/30 transition-colors ${selected?.id === d.id ? 'bg-accent' : ''}`}>
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

              {/* Pros & Cons summary */}
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

              {/* AI Evaluation Summary */}
              {selected.aiEvaluation && (
                <div className="mt-4 bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-foreground mb-1">AI Evaluation</p>
                  <p className="text-xs text-muted-foreground">{selected.aiEvaluation.summary.substring(0, 200)}…</p>
                </div>
              )}
            </div>

            {/* Escalation Warning */}
            {exceedsAuthority(selected) && (
              <div className="enterprise-card p-6 border-warning border-2">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Authority Limit Exceeded</p>
                    <p className="text-sm text-muted-foreground mt-1">This decision exceeds the CEO authorization limit (€5M) and must be escalated to the Board.</p>
                    <button className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-warning text-warning-foreground hover:opacity-90 transition-opacity">
                      <Shield className="h-4 w-4 inline mr-1" /> Escalate to Board
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!exceedsAuthority(selected) && (
              <div className="enterprise-card p-6">
                <p className="text-sm text-muted-foreground mb-4">Execution remains locked until CEO approval.</p>
                <div className="flex gap-3 flex-wrap">
                  <button className="px-4 py-2 rounded-lg text-sm font-medium gradient-primary text-primary-foreground hover:opacity-90"><CheckCircle className="h-4 w-4 inline mr-1" /> Approve</button>
                  <button className="px-4 py-2 rounded-lg text-sm font-medium bg-warning/10 text-warning hover:bg-warning/20"><Edit className="h-4 w-4 inline mr-1" /> Approve with Modification</button>
                  <button className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20"><XCircle className="h-4 w-4 inline mr-1" /> Reject</button>
                  <button className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/70"><RotateCcw className="h-4 w-4 inline mr-1" /> Send Back</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center enterprise-card p-12">
            <p className="text-muted-foreground text-sm">Select a decision to review</p>
          </div>
        )}
      </div>
    </div>
  );
}
