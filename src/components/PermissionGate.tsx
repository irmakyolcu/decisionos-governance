import { ReactNode } from 'react';
import { usePermissions, Permission } from '@/lib/permissions';
import { Lock } from 'lucide-react';

interface PermissionGateProps {
  permission: Permission;
  children: ReactNode;
  /** What to render when user lacks permission. Default: null (hide). Pass 'fallback' for a notice. */
  fallback?: ReactNode;
}

/** Conditionally renders children only if current user has the given permission */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { can } = usePermissions();
  if (!can(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

/** Inline read-only banner shown to viewers when an action is unavailable */
export function ReadOnlyNotice({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
      <Lock className="h-4 w-4 flex-shrink-0" />
      <span>{message ?? 'Bu sayfayı sadece görüntüleme yetkiniz var. Eylem yapmak için yöneticinizle iletişime geçin.'}</span>
    </div>
  );
}
