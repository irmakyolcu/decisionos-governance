import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon, trend, className }: MetricCardProps) {
  return (
    <div className={cn('metric-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs mt-1 font-medium', trend.positive ? 'text-success' : 'text-destructive')}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}
