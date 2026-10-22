import { useLanguage, translate, getLocale } from "@/contexts/LanguageContext";
import { useState, useMemo } from 'react';
import { useProposals } from '@/hooks/useProposals';
import { StatusBadge } from '@/components/StatusBadge';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { filterProposalsByRole } from '@/lib/roleHierarchy';
import { UserRole } from '@/types/decision';
import { FileText, Eye } from 'lucide-react';
import { CreateProposalDialog } from '@/components/CreateProposalDialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProposalsPage() {
  useLanguage();
  const [viewRole, setViewRole] = useState<UserRole>('CEO');
  const { proposals, loading } = useProposals();
  const visible = useMemo(() => filterProposalsByRole(proposals, viewRole), [proposals, viewRole]);

  return (
    <div>
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{translate("Proposals")}</h1>
          <p className="page-description">{translate("Decision proposals visible based on your role. Upper levels see all proposals below.")}</p>
        </div>
        <CreateProposalDialog />
      </div>

      <RoleSwitcher currentRole={viewRole} onChange={setViewRole} />

      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        <span>{translate("Showing")} <strong className="text-foreground">{visible.length}</strong> {translate("of")} {proposals.length} {translate("proposals visible to")} <strong className="text-foreground">{viewRole}</strong> {translate("level")}</span>
      </div>

      <div className="enterprise-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>{translate("Proposal")}</th><th>{translate("Department")}</th><th>{translate("Budget")}</th><th>{translate("Status")}</th><th>{translate("Submitted By")}</th><th>{translate("Authority Level")}</th><th>{translate("Date")}</th></tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted-foreground py-8">
                  {proposals.length === 0 ? translate("Henüz öneri yok. İlk önerinizi sunun.") : translate("No proposals visible at this authority level.")}
                </td></tr>
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
                    <td className="font-mono text-sm">€{p.budget.toLocaleString(getLocale())}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="text-muted-foreground">{p.submittedBy.name}</td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        p.submittedBy.role === 'Executive' ? 'bg-warning/10 text-warning' :
                        p.submittedBy.role === 'Manager' ? 'bg-info/10 text-info' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {translate(p.submittedBy.role)}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{p.submittedAt.toLocaleDateString(getLocale())}</td>
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
