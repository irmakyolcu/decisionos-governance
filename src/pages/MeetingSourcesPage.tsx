import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link2, Unlink, Download, MessagesSquare, CalendarDays, Users } from 'lucide-react';

type ConnectorId = 'slack' | 'google_calendar' | 'microsoft_teams';

const CONNECTORS: { id: ConnectorId; name: string; description: string; icon: typeof Link2 }[] = [
  { id: 'slack', name: 'Slack', description: 'Seçtiğiniz kanaldaki toplantı notlarını ve tartışmaları içe aktarır.', icon: MessagesSquare },
  { id: 'google_calendar', name: 'Google Meet / Calendar', description: 'Takvim etkinliklerini, katılımcıları ve etkinlik notlarını içe aktarır.', icon: CalendarDays },
  { id: 'microsoft_teams', name: 'Microsoft Teams', description: 'Teams kanal mesajlarını ve toplantı notlarını içe aktarır.', icon: Users },
];

interface ConnectorState {
  connector_id: ConnectorId;
  configured: boolean;
  status: string;
  connected_at: string | null;
}

export default function MeetingSourcesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<ConnectorState[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [sources, setSources] = useState<Record<string, { id: string; name: string }[]>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('app-user-connect', { body: { action: 'status' } });
    if (error) {
      toast({ title: 'Durum alınamadı', description: error.message, variant: 'destructive' });
    } else {
      setStates(data?.connectors ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { refresh(); }, [refresh]);

  const connect = async (id: ConnectorId) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke('app-user-connect', {
      body: { action: 'authorize', connector_id: id, return_url: `${window.location.origin}/meeting-sources` },
    });
    setBusy(null);
    if (error || data?.error) {
      toast({
        title: 'Bağlantı başlatılamadı',
        description: data?.error === 'connector_not_configured'
          ? 'Bu kaynak için workspace yöneticisinin OAuth istemcisini tanımlaması gerekiyor.'
          : (data?.error ?? error?.message),
        variant: 'destructive',
      });
      return;
    }
    if (data?.authorization_url) window.location.href = data.authorization_url;
  };

  const disconnect = async (id: ConnectorId) => {
    setBusy(id);
    await supabase.functions.invoke('app-user-connect', { body: { action: 'disconnect', connector_id: id } });
    setBusy(null);
    setSources((s) => ({ ...s, [id]: [] }));
    refresh();
  };

  const loadSources = async (id: ConnectorId) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke('meeting-sync', { body: { action: 'list', connector_id: id } });
    setBusy(null);
    if (error || data?.error) {
      toast({ title: 'Kaynaklar alınamadı', description: data?.error ?? error?.message, variant: 'destructive' });
      return;
    }
    setSources((s) => ({ ...s, [id]: data?.sources ?? [] }));
    if ((data?.sources ?? []).length === 0) toast({ title: 'Kaynak bulunamadı' });
  };

  const importMeetings = async (id: ConnectorId) => {
    const sourceId = selected[id];
    if (!sourceId) return;
    setBusy(id);
    const { data, error } = await supabase.functions.invoke('meeting-sync', {
      body: { action: 'import', connector_id: id, source_id: sourceId, days: 14 },
    });
    setBusy(null);
    if (error || data?.error) {
      toast({ title: 'İçe aktarma başarısız', description: data?.error ?? error?.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'İçe aktarma tamamlandı',
      description: data?.count ? `${data.count} toplantı kaydı oluşturuldu/güncellendi.` : (data?.message ?? 'Yeni kayıt bulunamadı.'),
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Toplantı Kaynakları</h1>
        <p className="page-description">
          Slack, Google Meet/Calendar ve Microsoft Teams üzerinden toplantı kayıtlarını ve notlarını içe aktarın.
          Her kullanıcı kendi hesabını bağlar; AI notları özetleyip aksiyon maddelerini çıkarır.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {CONNECTORS.map((c) => {
            const st = states.find((s) => s.connector_id === c.id);
            const connected = st?.status === 'connected';
            const Icon = c.icon;
            return (
              <div key={c.id} className="enterprise-card p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {connected ? 'Bağlı' : st?.configured ? 'Bağlı değil' : 'Kurulum gerekli'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={connected ? 'default' : 'secondary'}>{connected ? 'Aktif' : 'Pasif'}</Badge>
                </div>

                <p className="text-sm text-muted-foreground">{c.description}</p>

                {!st?.configured && (
                  <p className="text-xs rounded-md border border-border bg-muted/40 p-3 text-muted-foreground">
                    Bu kaynak için workspace yöneticisinin OAuth istemcisini tanımlaması gerekiyor.
                  </p>
                )}

                <div className="mt-auto space-y-3">
                  {connected ? (
                    <>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadSources(c.id)} disabled={busy === c.id}>
                          {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaynakları yükle'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => disconnect(c.id)} disabled={busy === c.id}>
                          <Unlink className="h-4 w-4 mr-1" /> Kaldır
                        </Button>
                      </div>

                      {(sources[c.id]?.length ?? 0) > 0 && (
                        <div className="space-y-2">
                          <Select value={selected[c.id] ?? ''} onValueChange={(v) => setSelected((s) => ({ ...s, [c.id]: v }))}>
                            <SelectTrigger><SelectValue placeholder="Kanal / takvim seçin" /></SelectTrigger>
                            <SelectContent>
                              {sources[c.id].map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" className="w-full" disabled={!selected[c.id] || busy === c.id} onClick={() => importMeetings(c.id)}>
                            {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                            Son 14 günü içe aktar
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Button size="sm" className="w-full" disabled={!st?.configured || busy === c.id} onClick={() => connect(c.id)}>
                      {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                      {c.name} hesabımı bağla
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
