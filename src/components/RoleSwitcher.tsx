import { UserRole } from '@/types/decision';
import { ALL_ROLES } from '@/lib/roleHierarchy';
import { Shield } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onChange: (role: UserRole) => void;
}

const roleBadgeColors: Record<UserRole, string> = {
  Employee: 'bg-muted text-muted-foreground',
  Manager: 'bg-info/10 text-info',
  Executive: 'bg-warning/10 text-warning',
  CEO: 'bg-primary/10 text-primary',
  Board: 'bg-destructive/10 text-destructive',
};

export function RoleSwitcher({ currentRole, onChange }: RoleSwitcherProps) {
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <Shield className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">Viewing as:</span>
      {ALL_ROLES.map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            currentRole === role
              ? `${roleBadgeColors[role]} ring-2 ring-primary/30`
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );
}
