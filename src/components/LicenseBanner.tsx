import { AlertTriangle, ShieldOff } from 'lucide-react';
import { useLicense } from '@/hooks/useLicense';

/**
 * On-premise license notice. Renders nothing on cloud installs or while
 * a valid, non-expiring license is active.
 */
export function LicenseBanner() {
  const { info, loading } = useLicense();
  if (loading || !info || info.license.mode === 'cloud') return null;

  const { mode, reason, days_remaining, expires_at, customer } = info.license;

  if (mode === 'unlicensed') {
    return (
      <div className="flex items-center gap-2 px-6 py-2 text-sm bg-destructive/10 text-destructive border-b border-destructive/30">
        <ShieldOff className="h-4 w-4 shrink-0" />
        <span>
          Bu kurulum lisanssız ({reason}). Yöneticiniz lisans anahtarını girene kadar
          AI ve raporlama özellikleri devre dışı.
        </span>
      </div>
    );
  }

  if (mode === 'grace') {
    return (
      <div className="flex items-center gap-2 px-6 py-2 text-sm bg-destructive/10 text-destructive border-b border-destructive/30">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Lisans süresi doldu. Ek süre bitmeden yenileyin.</span>
      </div>
    );
  }

  if (typeof days_remaining === 'number' && days_remaining <= 30) {
    return (
      <div className="flex items-center gap-2 px-6 py-2 text-sm bg-warning/10 text-warning-foreground border-b border-warning/30">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          {customer} lisansı {days_remaining} gün sonra sona eriyor
          {expires_at ? ` (${new Date(expires_at).toLocaleDateString()})` : ''}.
        </span>
      </div>
    );
  }

  return null;
}
