import { proposals } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { FileText } from 'lucide-react';

export default function ProposalsPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Proposals</h1>
        <p className="page-description">Decision proposals submitted for review and approval.</p>
      </div>

      <div className="enterprise-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Proposal</th><th>Department</th><th>Budget</th><th>Status</th><th>Submitted By</th><th>Date</th></tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
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
                <td className="text-muted-foreground">{p.submittedAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
