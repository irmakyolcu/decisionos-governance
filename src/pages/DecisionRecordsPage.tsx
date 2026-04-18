import { useState, useMemo } from 'react';
import { useDecisions } from '@/hooks/useDecisions';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { filterDecisionsByRole } from '@/lib/roleHierarchy';
import { UserRole } from '@/types/decision';
import { Archive, Lock, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DecisionRecordsPage() {
  const [viewRole, setViewRole] = useState<UserRole>('CEO');
  const { decisions, loading } = useDecisions();
  const finalized = useMemo(() => {
    const all = decisions.filter(d => ['Approved', 'Executed'].includes(d.status));
    return filterDecisionsByRole(all, viewRole);
  }, [decisions, viewRole]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Decision Records</h1>
        <p className="page-description">Immutable finalized decision records. Higher roles see records from all levels below.</p>
      </div>

      <RoleSwitcher currentRole={viewRole} onChange={setViewRole} />

      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        <span>Showing <strong className="text-foreground">{finalized.length}</strong> records visible to <strong className="text-foreground">{viewRole}</strong> level</span>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
        ) : finalized.length === 0 ? (
          <div className="enterprise-card p-12 text-center">
            <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No finalized decision records visible at this authority level.</p>
          </div>
        ) : (
          finalized.map((d) => (
            <div key={d.id} className="enterprise-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">{d.title}</h3>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      d.createdBy.role === 'Board' ? 'bg-destructive/10 text-destructive' :
                      d.createdBy.role === 'CEO' ? 'bg-primary/10 text-primary' :
                      d.createdBy.role === 'Executive' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {d.createdBy.role}
                    </span>
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
                  <p className="text-foreground">{d.createdBy.name} ({d.createdBy.role})</p>
                </div>
              </div>

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
