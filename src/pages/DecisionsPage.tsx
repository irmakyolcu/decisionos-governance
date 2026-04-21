import { useState, useMemo } from 'react';
import { useDecisions } from '@/hooks/useDecisions';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { filterDecisionsByRole } from '@/lib/roleHierarchy';
import { UserRole } from '@/types/decision';
import { GitBranch, Eye, Sparkles, Loader2 } from 'lucide-react';
import { CreateDecisionDialog } from '@/components/CreateDecisionDialog';
import { PermissionGate } from '@/components/PermissionGate';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DecisionsPage() {
  const [viewRole, setViewRole] = useState<UserRole>('CEO');
  const { decisions, loading, evaluatingStates } = useDecisions();
  const visible = useMemo(() => filterDecisionsByRole(decisions, viewRole), [decisions, viewRole]);

  return (
    <div>
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Decisions</h1>
          <p className="page-description">Decisions visible based on your role in the hierarchy. Upper levels see all decisions below them.</p>
        </div>
        <PermissionGate permission="createDecision">
          <CreateDecisionDialog />
        </PermissionGate>
      </div>

      <RoleSwitcher currentRole={viewRole} onChange={setViewRole} />

      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        <span>Showing <strong className="text-foreground">{visible.length}</strong> of {decisions.length} decisions visible to <strong className="text-foreground">{viewRole}</strong> level</span>
      </div>

      <div className="enterprise-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Decision</th>
                <th>Budget</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Authority Level</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted-foreground py-8">
                  {decisions.length === 0 ? 'Henüz karar yok. İlk kararınızı oluşturun.' : 'No decisions visible at this authority level.'}
                </td></tr>
              ) : (
                visible.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{d.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{d.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-sm">€{d.budget.toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <RiskBadge level={d.riskLevel} />
                        {evaluatingIds.has(d.id) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            AI analiz ediyor…
                          </span>
                        )}
                      </div>
                    </td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="text-muted-foreground">{d.createdBy.name}</td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        d.createdBy.role === 'Board' ? 'bg-destructive/10 text-destructive' :
                        d.createdBy.role === 'CEO' ? 'bg-primary/10 text-primary' :
                        d.createdBy.role === 'Executive' ? 'bg-warning/10 text-warning' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {d.createdBy.role}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{d.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
