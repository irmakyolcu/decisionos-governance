import { decisions } from '@/data/mockData';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { ThumbsUp, ThumbsDown, MessageSquare, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { useState } from 'react';
import { Decision } from '@/types/decision';
import { usePermissions } from '@/lib/permissions';
import { ReadOnlyNotice } from '@/components/PermissionGate';

export default function DecisionReviewPage() {
  const [selected, setSelected] = useState<Decision>(decisions[0]);
  const [newComment, setNewComment] = useState('');
  const { can, isViewer } = usePermissions();
  const canApproveAction = can('approveDecision');
  const canComment = can('comment');

  const hasProsAndCons = selected.pros.length > 0 && selected.cons.length > 0;
  const canApprove = hasProsAndCons && canApproveAction;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Decision Review</h1>
        <p className="page-description">Analyze proposals before approval. Pros and Cons are required.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision List */}
        <div className="enterprise-card">
          <div className="p-4 border-b border-border"><h3 className="font-semibold text-sm text-foreground">Decisions</h3></div>
          <div className="divide-y divide-border/50">
            {decisions.map((d) => (
              <button key={d.id} onClick={() => setSelected(d)} className={`w-full text-left p-4 hover:bg-muted/30 transition-colors ${selected.id === d.id ? 'bg-accent' : ''}`}>
                <p className="font-medium text-sm text-foreground">{d.title}</p>
                <div className="flex gap-2 mt-1"><StatusBadge status={d.status} /><RiskBadge level={d.riskLevel} /></div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <div className="enterprise-card p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{selected.title}</h2>
              <StatusBadge status={selected.status} />
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="font-medium text-foreground">Description:</span> <span className="text-muted-foreground">{selected.description}</span></div>
              <div><span className="font-medium text-foreground">Problem Statement:</span> <span className="text-muted-foreground">{selected.problemStatement}</span></div>
              <div><span className="font-medium text-foreground">Budget:</span> <span className="text-muted-foreground font-mono">€{selected.budget.toLocaleString()}</span></div>
              <div><span className="font-medium text-foreground">Risk:</span> <RiskBadge level={selected.riskLevel} /></div>
              <div>
                <span className="font-medium text-foreground">Options Considered:</span>
                <ul className="mt-1 space-y-1 ml-4">
                  {selected.optionsConsidered.map((o, i) => <li key={i} className="text-muted-foreground text-xs list-disc">{o}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="enterprise-card">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-success" />
                <h3 className="font-semibold text-sm text-foreground">Pros ({selected.pros.length})</h3>
              </div>
              <div className="divide-y divide-border/50">
                {selected.pros.map((p) => (
                  <div key={p.id} className="p-3">
                    <p className="text-sm text-foreground">{p.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.addedBy.name} · {p.timestamp.toLocaleDateString()}</p>
                  </div>
                ))}
                {selected.pros.length === 0 && <p className="p-4 text-xs text-muted-foreground">No pros added yet. At least one required.</p>}
              </div>
            </div>
            <div className="enterprise-card">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-destructive" />
                <h3 className="font-semibold text-sm text-foreground">Cons ({selected.cons.length})</h3>
              </div>
              <div className="divide-y divide-border/50">
                {selected.cons.map((c) => (
                  <div key={c.id} className="p-3">
                    <p className="text-sm text-foreground">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.addedBy.name} · {c.timestamp.toLocaleDateString()}</p>
                  </div>
                ))}
                {selected.cons.length === 0 && <p className="p-4 text-xs text-muted-foreground">No cons added yet. At least one required.</p>}
              </div>
            </div>
          </div>

          {/* Approval Gate */}
          <div className="enterprise-card p-6">
            {!hasProsAndCons && (
              <div className="flex items-center gap-2 text-warning bg-warning/10 p-3 rounded-lg mb-4 text-sm">
                <AlertTriangle className="h-4 w-4" />
                At least one Pro and one Con must be added before approval.
              </div>
            )}
            {canApproveAction ? (
              <div className="flex gap-3">
                <button disabled={!canApprove} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${canApprove ? 'gradient-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
                  <CheckCircle className="h-4 w-4 inline mr-1" />Approve
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">Reject</button>
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors">Send Back</button>
              </div>
            ) : (
              <ReadOnlyNotice message="Viewer rolünde kararları onaylayamaz veya reddedemezsiniz." />
            )}
          </div>

          {/* Comments */}
          <div className="enterprise-card">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Commentary</h3>
            </div>
            <div className="divide-y divide-border/50">
              {selected.comments.map((c) => (
                <div key={c.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{c.author.name}</span>
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{c.author.role}</span>
                    <span className="text-xs text-muted-foreground">{c.timestamp.toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              {canComment ? (
                <>
                  <div className="flex gap-2">
                    <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment…" className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none" />
                    <button className="px-4 py-2 rounded-lg text-sm font-medium gradient-primary text-primary-foreground">Post</button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Comments are immutable and cannot be deleted.</p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Yorum yapabilmek için Approver veya Admin yetkisi gerekir.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
