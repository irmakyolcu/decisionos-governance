import { decisions } from '@/data/mockData';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { Archive, Lock } from 'lucide-react';

export default function DecisionRecordsPage() {
  const finalized = decisions.filter(d => ['Approved', 'Executed'].includes(d.status));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Decision Records</h1>
        <p className="page-description">Immutable finalized decision records. These records are locked and cannot be modified.</p>
      </div>

      <div className="space-y-4">
        {finalized.length === 0 ? (
          <div className="enterprise-card p-12 text-center">
            <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No finalized decision records yet.</p>
          </div>
        ) : (
          finalized.map((d) => (
            <div key={d.id} className="enterprise-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">{d.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Record locked · {d.createdAt.toLocaleDateString()}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="font-mono font-medium text-foreground">€{d.budget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Level</p>
                  <RiskBadge level={d.riskLevel} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approvers</p>
                  <p className="text-foreground">{d.approvers.map(a => a.name).join(', ') || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <p className="text-foreground">{d.createdBy.name}</p>
                </div>
              </div>

              {/* Pros/Cons Snapshot */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs font-medium text-success mb-1">Pros</p>
                  {d.pros.map(p => <p key={p.id} className="text-xs text-muted-foreground">• {p.description}</p>)}
                </div>
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">Cons</p>
                  {d.cons.map(c => <p key={c.id} className="text-xs text-muted-foreground">• {c.description}</p>)}
                </div>
              </div>

              {d.aiEvaluation && (
                <div className="mt-4 bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-foreground mb-1">AI Evaluation Snapshot</p>
                  <p className="text-xs text-muted-foreground">ROI: {d.aiEvaluation.expectedROI}% · Risk Δ: {d.aiEvaluation.riskChange} pts · Value: €{d.aiEvaluation.expectedValue.toLocaleString()}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
