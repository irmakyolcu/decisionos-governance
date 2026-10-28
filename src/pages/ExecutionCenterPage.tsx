import { useLanguage, translate, getLocale } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTable } from '@/hooks/useGovernance';
import { ApprovalStatusBadge, AuthorityLevelBadge, RiskBadge, ContentHashChip } from '@/components/governance/StatusBadges';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Undo2 } from 'lucide-react';

const db = supabase as any;

export default function ExecutionCenterPage() {
  useLanguage();
  const { rows: actions, refetch } = useTable<any>('action_proposals');
  const { rows: records, error: recordsError, loading: recordsLoading } = useTable<any>('execution_records', 'executed_at');
  const { rows: approvals } = useTable<any>('action_approvals');
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  function execute() { toast.error(translate('integrity.unavailable')); }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{translate("Execution Center")}</h1>
        <p className="text-muted-foreground mt-1">{translate('integrity.unavailable')}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{translate("Action Proposals")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {actions.length === 0 && <li className="p-6 text-sm text-muted-foreground">{translate("No actions yet.")}</li>}
            {actions.map((a) => (
              <li key={a.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{a.title}</p>
                    <ContentHashChip hash={a.content_hash} version={a.version} />
                  </div>
                  <p className="text-xs text-muted-foreground">{a.action_type} → {a.target_system || 'internal'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ApprovalStatusBadge status={a.approval_status} />
                    <AuthorityLevelBadge level={a.authority_level} />
                    <RiskBadge level={a.risk_level} />
                  </div>
                </div>
                <Button size="sm" disabled title={translate('integrity.unavailable')} onClick={execute}>
                  <Play className="h-3 w-3 mr-1" /> {translate("Execute")}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{translate("Execution Records")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {recordsError && <li role="alert" className="p-4 text-destructive">{translate("Error")}: {recordsError}</li>}
            {recordsLoading && <li className="p-4">{translate("Loading…")}</li>}
            {records.length === 0 && <li className="p-6 text-sm text-muted-foreground">{translate("Nothing executed yet.")}</li>}
            {records.map((r) => (
              <li key={r.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{r.target_system || 'internal'} · v{r.action_version}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.executed_at).toLocaleString(getLocale())} · {r.result}{r.error_details ? ` · ${r.error_details}` : ''}</p>
                </div>
                <span className="text-xs text-warning">{translate('integrity.unverified')}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
