import { useLanguage, translate, getLocale } from "@/contexts/LanguageContext";
import { useState, useEffect } from 'react';
import { useDecisions } from '@/hooks/useDecisions';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { ThumbsUp, ThumbsDown, MessageSquare, AlertTriangle, CheckCircle, Lock, Sparkles, Loader2 } from 'lucide-react';
import { Decision } from '@/types/decision';
import { usePermissions } from '@/lib/permissions';
import { ReadOnlyNotice } from '@/components/PermissionGate';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { GmailSyncPanel } from '@/components/GmailSyncPanel';

export default function DecisionReviewPage() {
  useLanguage();
  const { decisions, loading, evaluatingStates, addComment, addProCon, approveDecision, updateStatus, evaluateDecision } = useDecisions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newPro, setNewPro] = useState('');
  const [newCon, setNewCon] = useState('');
  const [reevaluating, setReevaluating] = useState(false);
  const { can, isViewer } = usePermissions();
  const canApproveAction = can('approveDecision');
  const canComment = can('comment');
  const canCreateProposal = can('createProposal');
  const { toast } = useToast();

  useEffect(() => {
    if (!selectedId && decisions.length > 0) setSelectedId(decisions[0].id);
  }, [decisions, selectedId]);

  const selected: Decision | undefined = decisions.find(d => d.id === selectedId);

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!selected) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">{translate("Decision Review")}</h1></div>
        <div className="enterprise-card p-12 text-center text-muted-foreground">{translate("Henüz karar yok.")}</div>
      </div>
    );
  }

  const hasProsAndCons = selected.pros.length > 0 && selected.cons.length > 0;
  const canApprove = hasProsAndCons && canApproveAction;

  const handlePost = async () => {
    if (!newComment.trim()) return;
    try { await addComment(selected.id, newComment.trim()); setNewComment(''); }
    catch (e: any) { toast({ title: translate("Yorum eklenemedi"), description: e.message, variant: 'destructive' }); }
  };
  const handleAddPro = async () => {
    if (!newPro.trim()) return;
    try { await addProCon(selected.id, 'pro', newPro.trim()); setNewPro(''); }
    catch (e: any) { toast({ title: translate("Eklenemedi"), description: e.message, variant: 'destructive' }); }
  };
  const handleAddCon = async () => {
    if (!newCon.trim()) return;
    try { await addProCon(selected.id, 'con', newCon.trim()); setNewCon(''); }
    catch (e: any) { toast({ title: translate("Eklenemedi"), description: e.message, variant: 'destructive' }); }
  };
  const handleApprove = async () => {
    try { await approveDecision(selected.id); toast({ title: translate("Karar onaylandı") }); }
    catch (e: any) { toast({ title: translate("Onaylanamadı"), description: e.message, variant: 'destructive' }); }
  };
  const handleReject = async () => {
    try { await updateStatus(selected.id, 'Rejected'); toast({ title: translate("Karar reddedildi") }); }
    catch (e: any) { toast({ title: translate("Hata"), description: e.message, variant: 'destructive' }); }
  };
  const handleReevaluate = async () => {
    setReevaluating(true);
    try {
      await evaluateDecision(selected.id);
      toast({ title: translate("AI değerlendirmesi güncellendi"), description: translate("Yeni metrikler birkaç saniye içinde yansıyacak.") });
    } catch (e: any) {
      toast({ title: translate("Yeniden hesaplanamadı"), description: e.message, variant: 'destructive' });
    } finally {
      setReevaluating(false);
    }
  };

  return (
    <div>
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{translate("Decision Review")}</h1>
          <p className="page-description">{translate("Analyze proposals before approval. Pros and Cons are required.")}</p>
        </div>
        {canCreateProposal && (
          <button
            onClick={handleReevaluate}
            disabled={reevaluating}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
          >
            {reevaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {translate("AI değerlendirmesini yeniden hesapla")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="enterprise-card">
          <div className="p-4 border-b border-border"><h3 className="font-semibold text-sm text-foreground">{translate("Decisions")}</h3></div>
          <div className="divide-y divide-border/50">
            {decisions.map((d) => (
              <button key={d.id} onClick={() => setSelectedId(d.id)} className={`w-full text-left p-4 hover:bg-muted/30 transition-colors ${selected.id === d.id ? 'bg-accent' : ''}`}>
                <p className="font-medium text-sm text-foreground">{d.title}</p>
                <div className="flex gap-2 mt-1 items-center flex-wrap">
                  <StatusBadge status={translate(d.status)} />
                  <RiskBadge level={translate(d.riskLevel)} />
                  {evaluatingStates.has(d.id) && (() => {
                    const s = evaluatingStates.get(d.id)!;
                    const done = !!s.finishedAt;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${done ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary animate-pulse'}`}>
                        {done ? <Sparkles className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
                        {done
                          ? `${s.startedAt.toLocaleTimeString(getLocale())} → ${s.finishedAt!.toLocaleTimeString(getLocale())}`
                          : translate("AI analiz ediyor… · {v0}", {v0: s.startedAt.toLocaleTimeString()})}
                      </span>
                    );
                  })()}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="enterprise-card p-6">
            {evaluatingStates.has(selected.id) && (() => {
              const s = evaluatingStates.get(selected.id)!;
              const done = !!s.finishedAt;
              return (
                <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${done ? 'text-success bg-success/10' : 'text-primary bg-primary/10 animate-pulse'}`}>
                  {done ? <Sparkles className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>
                    {done
                      ? <>{translate("AI değerlendirmesi tamamlandı.")} <span className="font-mono text-xs opacity-80">{translate("başladı:")} {s.startedAt.toLocaleTimeString(getLocale())} {translate("· bitti:")} {s.finishedAt!.toLocaleTimeString(getLocale())}</span></>
                      : <>{translate("AI bu kararı yeniden analiz ediyor…")} <span className="font-mono text-xs opacity-80">{translate("başladı:")} {s.startedAt.toLocaleTimeString(getLocale())}</span></>}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{selected.title}</h2>
              <StatusBadge status={translate(selected.status)} />
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="font-medium text-foreground">{translate("Description:")}</span> <span className="text-muted-foreground">{selected.description}</span></div>
              <div><span className="font-medium text-foreground">{translate("Problem Statement:")}</span> <span className="text-muted-foreground">{selected.problemStatement}</span></div>
              <div><span className="font-medium text-foreground">{translate("Budget:")}</span> <span className="text-muted-foreground font-mono">€{selected.budget.toLocaleString(getLocale())}</span></div>
              <div><span className="font-medium text-foreground">Risk:</span> <RiskBadge level={translate(selected.riskLevel)} /></div>
              {selected.optionsConsidered.length > 0 && (
                <div>
                  <span className="font-medium text-foreground">{translate("Options Considered:")}</span>
                  <ul className="mt-1 space-y-1 ml-4">
                    {selected.optionsConsidered.map((o, i) => <li key={i} className="text-muted-foreground text-xs list-disc">{o}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="enterprise-card">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-success" />
                <h3 className="font-semibold text-sm text-foreground">{translate("Pros (")}{selected.pros.length})</h3>
              </div>
              <div className="divide-y divide-border/50">
                {selected.pros.map((p) => (
                  <div key={p.id} className="p-3">
                    <p className="text-sm text-foreground">{p.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.addedBy.name} · {p.timestamp.toLocaleDateString(getLocale())}</p>
                  </div>
                ))}
                {selected.pros.length === 0 && <p className="p-4 text-xs text-muted-foreground">{translate("Henüz artı yok. En az bir tane gerekli.")}</p>}
              </div>
              {!isViewer && (
                <div className="p-3 border-t border-border flex gap-2">
                  <input value={newPro} onChange={(e) => setNewPro(e.target.value)} placeholder={translate("Artı ekle…")} className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 outline-none" />
                  <button onClick={handleAddPro} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20">{translate("Ekle")}</button>
                </div>
              )}
            </div>
            <div className="enterprise-card">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-destructive" />
                <h3 className="font-semibold text-sm text-foreground">{translate("Cons (")}{selected.cons.length})</h3>
              </div>
              <div className="divide-y divide-border/50">
                {selected.cons.map((c) => (
                  <div key={c.id} className="p-3">
                    <p className="text-sm text-foreground">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.addedBy.name} · {c.timestamp.toLocaleDateString(getLocale())}</p>
                  </div>
                ))}
                {selected.cons.length === 0 && <p className="p-4 text-xs text-muted-foreground">{translate("Henüz eksi yok. En az bir tane gerekli.")}</p>}
              </div>
              {!isViewer && (
                <div className="p-3 border-t border-border flex gap-2">
                  <input value={newCon} onChange={(e) => setNewCon(e.target.value)} placeholder={translate("Eksi ekle…")} className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 outline-none" />
                  <button onClick={handleAddCon} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20">{translate("Ekle")}</button>
                </div>
              )}
            </div>
          </div>

          <div className="enterprise-card p-6">
            {!hasProsAndCons && (
              <div className="flex items-center gap-2 text-warning bg-warning/10 p-3 rounded-lg mb-4 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {translate("Onay için en az bir Artı ve bir Eksi eklenmeli.")}
              </div>
            )}
            {selected.status === 'Approved' && (
              <div className="flex items-center gap-2 text-success bg-success/10 p-3 rounded-lg mb-4 text-sm">
                <Lock className="h-4 w-4" />
                {translate("Bu karar onaylandı ve kilitli (değiştirilemez).")}
              </div>
            )}
            {canApproveAction && selected.status !== 'Approved' && selected.status !== 'Rejected' ? (
              <div className="flex gap-3">
                <button onClick={handleApprove} disabled={!canApprove} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${canApprove ? 'gradient-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
                  <CheckCircle className="h-4 w-4 inline mr-1" />{translate("Onayla")}
                </button>
                <button onClick={handleReject} className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">{translate("Reddet")}</button>
              </div>
            ) : !canApproveAction ? (
              <ReadOnlyNotice message="Viewer rolünde kararları onaylayamaz veya reddedemezsiniz." />
            ) : null}
          </div>

          <div className="enterprise-card">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">{translate("Commentary")}</h3>
            </div>
            <div className="divide-y divide-border/50">
              {selected.comments.map((c) => (
                <div key={c.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{c.author.name}</span>
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{translate(c.author.role)}</span>
                    <span className="text-xs text-muted-foreground">{c.timestamp.toLocaleDateString(getLocale())}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.content}</p>
                </div>
              ))}
              {selected.comments.length === 0 && <p className="p-4 text-xs text-muted-foreground">{translate("Henüz yorum yok.")}</p>}
            </div>
            <div className="p-4 border-t border-border">
              {canComment ? (
                <>
                  <div className="flex gap-2">
                    <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={translate("Yorum ekle…")} className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none" />
                    <button onClick={handlePost} className="px-4 py-2 rounded-lg text-sm font-medium gradient-primary text-primary-foreground">{translate("Gönder")}</button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{translate("Yorumlar değiştirilemez ve silinemez.")}</p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  {translate("Yorum yapabilmek için Approver veya Admin yetkisi gerekir.")}
                </div>
              )}
            </div>
          </div>

          <GmailSyncPanel decisionId={selected.id} defaultQuery={selected.title} />
        </div>
      </div>
    </div>
  );
}
