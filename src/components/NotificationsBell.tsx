import { tr as trLocale, enUS } from 'date-fns/locale';
import { useLanguage, translate, getLocale } from '@/contexts/LanguageContext';
import { Bell, CheckCheck, Check, RefreshCw, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-info/10 text-info border-info/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  success: 'bg-success/10 text-success border-success/20',
};

export function NotificationsBell() {
  useLanguage();
  const { items, unread, loading, error, marking, load, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={value => { setOpen(value); if (value) void load(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label={translate('Notifications')}>
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unread > 0 && <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] p-0" align="end">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold">{translate('Notifications')}</div>
          <div className="flex items-center gap-1">
            {unread > 0 && <Button variant="ghost" size="sm" disabled={marking} onClick={() => void markRead()} className="h-7 text-xs gap-1"><CheckCheck className="h-3 w-3" />{translate('Mark all read')}</Button>}
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={loading} onClick={() => void load()} aria-label={translate('notifications.refresh')} title={translate('notifications.refresh')}><RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>
        </div>
        {error && <p role="alert" className="px-4 py-3 text-xs text-destructive">{translate(error)}</p>}
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{loading ? <span className="flex justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{translate('notifications.loading')}</span> : !error && translate('No notifications yet')}</div> :
            <div className="divide-y divide-border">{items.map(n => {
              const content = <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-start justify-between gap-2"><span className="text-sm font-medium text-foreground break-words">{n.kind.startsWith('system.') ? translate(n.title) : n.title}</span><Badge variant="outline" className={`shrink-0 text-[10px] ${SEVERITY_STYLES[n.severity] ?? ''}`}>{translate(n.severity)}</Badge></div>
                {n.body && <p className="text-xs text-muted-foreground line-clamp-2 break-words">{n.body}</p>}
                <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: getLocale() === 'tr-TR' ? trLocale : enUS })}</span>
              </div>;
              const safeLink = n.link?.startsWith('/') && !n.link.startsWith('//') ? n.link : null;
              return <div key={n.id} className={`flex items-start gap-2 px-4 py-3 ${!n.read_at ? 'bg-muted/30' : ''}`}>
                {safeLink ? <Link to={safeLink} className="min-w-0 flex-1" onClick={() => { void markRead(n.id); setOpen(false); }}>{content}</Link> : <div className="min-w-0 flex-1">{content}</div>}
                {!n.read_at && <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={marking} onClick={() => void markRead(n.id)} aria-label={translate('notifications.markRead')} title={translate('notifications.markRead')}><Check className="h-3 w-3" /></Button>}
              </div>;
            })}</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}