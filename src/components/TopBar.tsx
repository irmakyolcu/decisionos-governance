import { Search, User, LogOut, Shield, CheckCircle, Eye, Loader2 } from 'lucide-react';
import { NotificationsBell } from '@/components/NotificationsBell';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';

type SearchHit = { id: string; title: string; kind: string; href: string };


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

  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const term = search.trim();
    if (!workspace || term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const like = `%${term}%`;
      const [d, k, c, p] = await Promise.all([
        supabase.from('decisions').select('id,title').eq('workspace_id', workspace.id).ilike('title', like).limit(5),
        supabase.from('knowledge_items').select('id,title').eq('workspace_id', workspace.id).ilike('title', like).limit(5),
        supabase.from('clients').select('id,name').eq('workspace_id', workspace.id).ilike('name', like).limit(3),
        supabase.from('projects').select('id,name').eq('workspace_id', workspace.id).ilike('name', like).limit(3),
      ]);
      const next: SearchHit[] = [
        ...(d.data ?? []).map((r: any) => ({ id: r.id, title: r.title, kind: 'Decision', href: `/decisions/${r.id}` })),
        ...(k.data ?? []).map((r: any) => ({ id: r.id, title: r.title, kind: 'Knowledge', href: `/company-brain` })),
        ...(c.data ?? []).map((r: any) => ({ id: r.id, title: r.name, kind: 'Client', href: `/clients` })),
        ...(p.data ?? []).map((r: any) => ({ id: r.id, title: r.name, kind: 'Project', href: `/projects` })),
      ];
      setHits(next);
      setLoading(false);
      setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [search, workspace]);

  const goAsk = () => {
    const term = search.trim();
    if (!term) return;
    setOpen(false);
    navigate(`/ask?q=${encodeURIComponent(term)}`);
  };

  const nameToShow = displayName || user?.user_metadata?.full_name || user?.email || 'Kullanıcı';
  const initials = nameToShow.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
      <div ref={boxRef} className="relative flex items-center gap-3 flex-1 max-w-md">
        {loading ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="h-4 w-4 text-muted-foreground" />
        )}
        <input
          type="text"
          placeholder="Search decisions, knowledge, clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => search.trim().length >= 2 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') goAsk();
            if (e.key === 'Escape') setOpen(false);
          }}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
        {open && search.trim().length >= 2 && (
          <div className="absolute top-11 left-0 right-0 z-50 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
            {hits.length === 0 && !loading && (
              <div className="px-3 py-3 text-xs text-muted-foreground">No matches found.</div>
            )}
            {hits.map((h) => (
              <button
                key={`${h.kind}-${h.id}`}
                onClick={() => { setOpen(false); navigate(h.href); }}
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center justify-between gap-3"
              >
                <span className="text-sm text-foreground truncate">{h.title}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">{h.kind}</Badge>
              </button>
            ))}
            <button
              onClick={goAsk}
              className="w-full text-left px-3 py-2 border-t border-border text-xs text-primary hover:bg-muted transition-colors"
            >
              Ask DecisionOS: “{search.trim()}”
            </button>
          </div>
        )}
      </div>


      <div className="flex items-center gap-4">
        <LanguageToggle />
        <NotificationsBell />



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
        </Link>

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
