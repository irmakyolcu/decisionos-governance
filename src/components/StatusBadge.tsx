import { cn } from '@/lib/utils';
import { DecisionStatus, RiskLevel, OutcomeStatus } from '@/types/decision';

const statusColors: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Pending: 'bg-warning/10 text-warning',
  'Under Review': 'bg-info/10 text-info',
  Approved: 'bg-success/10 text-success',
  Rejected: 'bg-destructive/10 text-destructive',
  Escalated: 'bg-warning/10 text-warning',
  Executed: 'bg-primary/10 text-primary',
  Submitted: 'bg-info/10 text-info',
  Success: 'bg-success/10 text-success',
  'Partial Success': 'bg-warning/10 text-warning',
  Failure: 'bg-destructive/10 text-destructive',
};

const riskColors: Record<RiskLevel, string> = {
  Low: 'bg-success/10 text-success',
  Medium: 'bg-warning/10 text-warning',
  High: 'bg-destructive/10 text-destructive',
  Critical: 'bg-destructive/20 text-destructive font-semibold',
};

export function StatusBadge({ status }: { status: DecisionStatus | OutcomeStatus | string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusColors[status] || 'bg-muted text-muted-foreground')}>
      {status}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', riskColors[level])}>
      {level}
    </span>
  );
}
