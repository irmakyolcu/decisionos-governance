import { Search, Bell, User, LogOut, Shield, CheckCircle, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';

const ROLE_BADGE = {
  admin: { label: 'Admin', icon: Shield, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  approver: { label: 'Approver', icon: CheckCircle, className: 'bg-warning/10 text-warning border-warning/20' },
  viewer: { label: 'Viewer', icon: Eye, className: 'bg-info/10 text-info border-info/20' },
} as const;

export function TopBar() {
  const [search, setSearch] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const { role, workspace } = useWorkspace();
  const roleBadge = role ? ROLE_BADGE[role] : null;

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('avatar_url, display_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url ?? null);
        setDisplayName(data?.display_name ?? null);
      });
  }, [user]);

  const nameToShow = displayName || user?.user_metadata?.full_name || user?.email || 'Kullanıcı';
  const initials = nameToShow.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search internal decisions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </button>

        <Link to="/profile" className="flex items-center gap-2 hover:bg-muted rounded-md px-2 py-1 transition-colors" title="Profili Düzenle">
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={nameToShow} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="hidden lg:flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">{nameToShow}</span>
            {workspace && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{workspace.name}</span>
            )}
          </div>
          {roleBadge && (
            <Badge variant="outline" className={`gap-1 ${roleBadge.className}`}>
              <roleBadge.icon className="h-3 w-3" />
              <span className="text-xs">{roleBadge.label}</span>
            </Badge>
          )}
        </div>

        <button
          onClick={signOut}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          title="Çıkış Yap"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
