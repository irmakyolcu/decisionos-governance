import { decisions } from '@/data/mockData';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { GitBranch } from 'lucide-react';

export default function DecisionsPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Decisions</h1>
        <p className="page-description">All organizational decisions and their current status.</p>
      </div>

      <div className="enterprise-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Decision</th>
              <th>Budget</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d) => (
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
                <td><RiskBadge level={d.riskLevel} /></td>
                <td><StatusBadge status={d.status} /></td>
                <td className="text-muted-foreground">{d.createdBy.name}</td>
                <td className="text-muted-foreground">{d.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
