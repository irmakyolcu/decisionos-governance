import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const riskColors: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  critical: 'bg-red-500/10 text-red-600 border-red-500/30',
};

export function RiskBadge({ level }: { level?: string | null }) {
  const k = (level || 'medium').toLowerCase();
  return <Badge variant="outline" className={cn('capitalize', riskColors[k] || riskColors.medium)}>{k} risk</Badge>;
}

const authorityLabels: Record<string, { label: string; cls: string }> = {
  observe: { label: 'L0 · Observe', cls: 'bg-muted text-muted-foreground' },
  prepare: { label: 'L1 · Prepare', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  act: { label: 'L2 · Act · 1 approver', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  commit: { label: 'L3 · Commit · 2 approvers', cls: 'bg-red-500/10 text-red-600 border-red-500/30' },
};
export function AuthorityLevelBadge({ level }: { level: string }) {
  const a = authorityLabels[level] || authorityLabels.act;
  return <Badge variant="outline" className={a.cls}>{a.label}</Badge>;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  awaiting_policy: 'bg-blue-500/10 text-blue-600',
  awaiting_approval: 'bg-amber-500/10 text-amber-600',
  partially_approved: 'bg-amber-500/10 text-amber-700',
  approved: 'bg-emerald-500/10 text-emerald-600',
  scheduled: 'bg-blue-500/10 text-blue-600',
  executing: 'bg-blue-500/10 text-blue-600',
  completed: 'bg-emerald-500/10 text-emerald-700',
  failed: 'bg-red-500/10 text-red-600',
  rolled_back: 'bg-orange-500/10 text-orange-600',
  cancelled: 'bg-muted text-muted-foreground',
  expired: 'bg-muted text-muted-foreground',
};
export function ApprovalStatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={cn('capitalize', statusColors[status] || statusColors.draft)}>{status.replace(/_/g, ' ')}</Badge>;
}

export function ContentHashChip({ hash, version }: { hash?: string | null; version: number }) {
  if (!hash) return <span className="text-xs text-muted-foreground">v{version}</span>;
  return (
    <span className="text-xs font-mono text-muted-foreground" title={hash}>
      v{version} · {hash.slice(0, 8)}
    </span>
  );
}
