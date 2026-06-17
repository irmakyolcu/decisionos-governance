import { cn } from '@/lib/utils';

interface Props {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

/** Circular Strategic Alignment Score visualization. */
export function AlignmentScore({ score, size = 'md', label = 'Strategic Alignment', className }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const dims = size === 'sm' ? 72 : size === 'lg' ? 160 : 112;
  const stroke = size === 'sm' ? 6 : size === 'lg' ? 12 : 10;
  const r = (dims - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  const tone =
    clamped >= 80 ? 'text-success'
    : clamped >= 60 ? 'text-primary'
    : clamped >= 40 ? 'text-warning'
    : 'text-destructive';

  const verdict =
    clamped >= 80 ? 'Strongly aligned with CEO logic'
    : clamped >= 60 ? 'Aligned, minor tradeoffs'
    : clamped >= 40 ? 'Partial fit — review carefully'
    : 'Misaligned with CEO priorities';

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: dims, height: dims }}>
        <svg width={dims} height={dims} className="-rotate-90">
          <circle cx={dims / 2} cy={dims / 2} r={r} stroke="currentColor" strokeWidth={stroke}
            className="text-muted/30" fill="none" />
          <circle cx={dims / 2} cy={dims / 2} r={r} stroke="currentColor" strokeWidth={stroke}
            className={tone} fill="none" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 600ms ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn('font-bold leading-none', tone, size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-4xl' : 'text-2xl')}>
            {clamped}
          </div>
          {size !== 'sm' && <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">/ 100</div>}
        </div>
      </div>
      {size !== 'sm' && (
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className={cn('text-xs mt-0.5', tone)}>{verdict}</p>
        </div>
      )}
    </div>
  );
}
