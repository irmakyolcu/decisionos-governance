import { useState } from 'react';
import { proposals } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { filterProposalsByRole } from '@/lib/roleHierarchy';
import { UserRole } from '@/types/decision';
import { FileText, Eye } from 'lucide-react';

export default function ProposalsPage() {
  const [viewRole, setViewRole] = useState<UserRole>('CEO');
  const visible = filterProposalsByRole(proposals, viewRole);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Proposals</h1>
        <p className="page-description">Decision proposals visible based on your role. Upper levels see all proposals below.</p>
      </div>

      <RoleSwitcher currentRole={viewRole} onChange={setViewRole} />

      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        <span>Showing <strong className="text-foreground">{visible.length}</strong> of {proposals.length} proposals visible to <strong className="text-foreground">{viewRole}</strong> level</span>
      </div>

      <div className="enterprise-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Proposal</th><th>Department</th><th>Budget</th><th>Status</th><th>Submitted By</th><th>Authority Level</th><th>Date</th></tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-8">No proposals visible at this authority level.</td></tr>
            ) : (
              visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{p.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{p.department}</td>
                  <td className="font-mono text-sm">€{p.budget.toLocaleString()}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="text-muted-foreground">{p.submittedBy.name}</td>
                  <td>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      p.submittedBy.role === 'Executive' ? 'bg-warning/10 text-warning' :
                      p.submittedBy.role === 'Manager' ? 'bg-info/10 text-info' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {p.submittedBy.role}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{p.submittedAt.toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
