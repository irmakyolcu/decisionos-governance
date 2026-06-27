import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
  kind: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-info/10 text-info border-info/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  success: 'bg-success/10 text-success border-success/20',
};

export function NotificationsBell() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unread = items.filter((n) => !n.read_at).length;

  const load = async () => {
    if (!user || !workspace) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setItems((data ?? []) as Notification[]);
  };

  useEffect(() => {
    load();
    if (!user || !workspace) return;
    const channel = supabase
      .channel('notifications-' + user.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, workspace?.id]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    load();
  };

  const markOneRead = async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors" aria-label="Notifications">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-xs gap-1">
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            <div className="divide-y">
              {items.map((n) => {
                const body = (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{n.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${SEVERITY_STYLES[n.severity] ?? ''}`}>
                        {n.severity}
                      </Badge>
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
                return (
                  <div
                    key={n.id}
                    onClick={() => markOneRead(n.id)}
                    className={`px-4 py-3 cursor-pointer hover:bg-muted/50 ${!n.read_at ? 'bg-muted/30' : ''}`}
                  >
                    {n.link ? (
                      <Link to={n.link} onClick={() => setOpen(false)}>
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
