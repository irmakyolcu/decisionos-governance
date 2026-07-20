import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  History, Search, Link2, Unlink, Sparkles, Wand2, Download, Trash2,
  GitBranch, Lightbulb, User, Clock,
} from 'lucide-react';
import { useLinkAudit, type LinkAuditEntry } from '@/hooks/useLinkAudit';
import { toast } from 'sonner';
import { usePermissions } from '@/lib/permissions';
import { Card as UICard, CardContent as UICardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

const ACTION_META: Record<LinkAuditEntry['action'], { label: string; cls: string; icon: any }> = {
  link:        { label: 'Linked',    cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30', icon: Link2 },
  unlink:      { label: 'Unlinked',  cls: 'bg-red-500/10 text-red-700 border-red-500/30',             icon: Unlink },
  bulk_link:   { label: 'Bulk link', cls: 'bg-blue-500/10 text-blue-700 border-blue-500/30',          icon: Wand2 },
  bulk_unlink: { label: 'Bulk unlink', cls: 'bg-red-500/10 text-red-700 border-red-500/30',           icon: Unlink },
};
const SOURCE_META: Record<LinkAuditEntry['source'], { label: string; icon: any }> = {
  manual:        { label: 'Manual',        icon: User },
  suggestion:    { label: 'Suggestion',    icon: Sparkles },
  auto_link_all: { label: 'Auto-link all', icon: Wand2 },
};

export default function LinkAuditPage() {
  const { entries, clear } = useLinkAudit();
  const { isAdmin, isApprover, role } = usePermissions();
  const canView = isAdmin || isApprover;
  const canClear = isAdmin;
  const [q, setQ] = useState('');
  const [actionF, setActionF] = useState('all');
  const [sourceF, setSourceF] = useState('all');
  const [actorF, setActorF] = useState('all');

  if (!canView) {
    return (
      <UICard className="max-w-lg mx-auto mt-16">
        <UICardContent className="p-8 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Erişim yetkiniz yok</h2>
          <p className="text-sm text-muted-foreground">
            Link Audit Trail yalnızca Admin ve Approver rollerine açıktır.
            {role ? ` Mevcut rolünüz: ${role}.` : ''}
          </p>
        </UICardContent>
      </UICard>
    );
  }

  const actors = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => { if (e.actorEmail) s.add(e.actorEmail); });
    return Array.from(s);
  }, [entries]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return entries.filter((e) => {
      const okQ = !ql || [e.lessonTitle, e.decisionTitle, e.actorEmail].some((v) => v?.toLowerCase().includes(ql));
      const okA = actionF === 'all' || e.action === actionF;
      const okS = sourceF === 'all' || e.source === sourceF;
      const okU = actorF === 'all' || e.actorEmail === actorF;
      return okQ && okA && okS && okU;
    });
  }, [entries, q, actionF, sourceF, actorF]);

  const grouped = useMemo(() => {
    const g: Record<string, LinkAuditEntry[]> = {};
    filtered.forEach((e) => {
      const day = new Date(e.at).toLocaleDateString();
      (g[day] ||= []).push(e);
    });
    return Object.entries(g);
  }, [filtered]);

  function exportCsv() {
    const header = ['at','actor_email','action','source','lesson_id','lesson_title','decision_id','decision_title'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [header.join(','), ...filtered.map((e) => [
      e.at, e.actorEmail, e.action, e.source, e.lessonId, e.lessonTitle, e.decisionId, e.decisionTitle,
    ].map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `link-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${filtered.length} kayıt dışa aktarıldı`);
  }

  const stats = useMemo(() => ({
    total: entries.length,
    links: entries.filter((e) => e.action === 'link' || e.action === 'bulk_link').length,
    unlinks: entries.filter((e) => e.action === 'unlink' || e.action === 'bulk_unlink').length,
    actors: actors.length,
  }), [entries, actors.length]);

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <History className="h-6 w-6 text-primary" /> Link Audit Trail
          </h1>
          <p className="page-description">
            Kim, ne zaman, hangi ders–karar bağlantısını ekledi veya kaldırdı — tümü değiştirilemez bir kayıt olarak.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={entries.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" /> Clear log
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Audit kaydını temizle?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu işlem geri alınamaz. Tüm bağlantı geçmişi silinir ancak mevcut ders–karar bağları korunur.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction onClick={() => { clear(); toast.success('Audit kaydı temizlendi'); }}>Temizle</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total events" value={stats.total} />
        <Stat label="Links added" value={stats.links} />
        <Stat label="Links removed" value={stats.unlinks} />
        <Stat label="Distinct actors" value={stats.actors} />
      </div>

      <Card><CardContent className="p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lesson, decision or actor…" className="pl-9" />
        </div>
        <Select value={actionF} onValueChange={setActionF}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="link">Link</SelectItem>
            <SelectItem value="unlink">Unlink</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceF} onValueChange={setSourceF}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="suggestion">Suggestion</SelectItem>
            <SelectItem value="auto_link_all">Auto-link all</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actorF} onValueChange={setActorF}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Actor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actors</SelectItem>
            {actors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardContent></Card>

      {grouped.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          <History className="h-6 w-6 mx-auto mb-2 opacity-50" /> No audit events match.
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, list]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{day}</div>
                <div className="h-px flex-1 bg-border" />
                <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
              </div>
              <Card>
                <CardContent className="p-0 divide-y">
                  {list.map((e) => {
                    const A = ACTION_META[e.action];
                    const S = SOURCE_META[e.source];
                    const AIcon = A.icon, SIcon = S.icon;
                    return (
                      <div key={e.id} className="p-4 grid grid-cols-[auto_1fr_auto] gap-3 items-start">
                        <div className={`h-8 w-8 rounded-md border flex items-center justify-center ${A.cls}`}>
                          <AIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${A.cls}`}>{A.label}</Badge>
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <SIcon className="h-3 w-3" /> {S.label}
                            </span>
                          </div>
                          <div className="mt-1.5 text-sm flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5 text-primary" /><span className="font-medium">{e.lessonTitle}</span></span>
                            <span className="text-muted-foreground text-xs">
                              {e.action.includes('unlink') ? '⊘' : '↔'}
                            </span>
                            <span className="inline-flex items-center gap-1"><GitBranch className="h-3.5 w-3.5 text-primary" /><span className="font-medium">{e.decisionTitle}</span></span>
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {e.actorEmail ?? 'unknown'}</span>
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(e.at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}
