import { authorityLimits } from '@/data/mockData';
import { Shield, AlertTriangle } from 'lucide-react';

export default function AuthorityPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Authority & Budget Limits</h1>
        <p className="page-description">Organizational hierarchy and approval authority matrix.</p>
      </div>

      <div className="enterprise-card overflow-hidden mb-6">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Authority Matrix</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Max Budget</th>
              <th>Risk Level</th>
              <th>Approval Scope</th>
            </tr>
          </thead>
          <tbody>
            {authorityLimits.map((limit) => (
              <tr key={limit.role}>
                <td className="font-medium text-foreground">{limit.role}</td>
                <td className="font-mono">{limit.maxBudgetDisplay}</td>
                <td>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    limit.riskLevel === 'Low' ? 'bg-success/10 text-success' :
                    limit.riskLevel === 'Medium' ? 'bg-warning/10 text-warning' :
                    limit.riskLevel === 'High' ? 'bg-destructive/10 text-destructive' :
                    'bg-destructive/20 text-destructive'
                  }`}>{limit.riskLevel}</span>
                </td>
                <td className="text-muted-foreground">{limit.approvalScope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="enterprise-card p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground">Escalation Rules</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>• Employees cannot approve decisions. All proposals must be elevated to Manager level.</li>
              <li>• Managers can approve within their department and budget limit (€250k).</li>
              <li>• Executives can approve cross-department decisions up to €2M.</li>
              <li>• CEO can approve decisions up to €5M organization-wide.</li>
              <li>• Decisions exceeding €5M are automatically escalated to the Board.</li>
              <li>• Risk level must match or be below the approver's authority level.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
