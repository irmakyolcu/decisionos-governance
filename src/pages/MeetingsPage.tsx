import { useState, useEffect } from 'react';
import { useMeetings } from '@/hooks/useMeetings';
import { useDecisions } from '@/hooks/useDecisions';
import { StatusBadge } from '@/components/StatusBadge';
import { Calendar, MapPin, Users, Clock, GitBranch, ChevronRight } from 'lucide-react';
import { Decision } from '@/types/decision';
import { MeetingRecordings } from '@/components/MeetingRecordings';
import { CreateMeetingDialog } from '@/components/CreateMeetingDialog';
import { PermissionGate } from '@/components/PermissionGate';
import { Skeleton } from '@/components/ui/skeleton';

export default function MeetingsPage() {
  const { meetings, loading } = useMeetings();
  const { decisions } = useDecisions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && meetings.length > 0) setSelectedId(meetings[0].id);
  }, [meetings, selectedId]);

  const selectedMeeting = meetings.find(m => m.id === selectedId);

  const getLinkedDecision = (decisionId?: string): Decision | undefined => {
    if (!decisionId) return undefined;
    return decisions.find(d => d.id === decisionId);
  };

  const meetingDecisions = selectedMeeting
    ? decisions.filter(d => d.meetingId === selectedMeeting.id)
    : [];

  return (
    <div>
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Meeting Records</h1>
          <p className="page-description">Board and executive meeting logs with linked decisions.</p>
        </div>
        <PermissionGate permission="createDecision">
          <CreateMeetingDialog />
        </PermissionGate>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : meetings.length === 0 ? (
        <div className="enterprise-card p-12 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Henüz toplantı yok. İlk toplantınızı oluşturun.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="enterprise-card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">All Meetings</h3>
            </div>
            <div className="divide-y divide-border/50">
              {meetings.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left p-4 hover:bg-muted/30 transition-colors ${selectedMeeting?.id === m.id ? 'bg-accent' : ''}`}
                >
                  <p className="font-medium text-sm text-foreground">{m.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.date.toLocaleDateString()} · {m.startTime}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {m.isApproved ? <StatusBadge status="Approved" /> : <StatusBadge status="Pending" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedMeeting && (
            <div className="lg:col-span-2 space-y-6">
              <div className="enterprise-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">{selectedMeeting.title}</h2>
                  {selectedMeeting.isApproved ? <StatusBadge status="Approved" /> : <StatusBadge status="Pending" />}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" />{selectedMeeting.date.toLocaleDateString()}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" />{selectedMeeting.startTime} – {selectedMeeting.endTime} ({selectedMeeting.duration}min)</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{selectedMeeting.location || '—'}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" />{selectedMeeting.attendees.length} attendees</div>
                </div>

                {selectedMeeting.chairperson?.name && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Chairperson:</span> {selectedMeeting.chairperson.name} ({selectedMeeting.chairperson.role})</p>
                  </div>
                )}
              </div>

              <div className="enterprise-card">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground text-sm">Agenda Items</h3>
                </div>
                <div className="divide-y divide-border/50">
                  {selectedMeeting.agenda.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">Gündem maddesi yok.</p>
                  ) : selectedMeeting.agenda.map((item, i) => {
                    const linked = getLinkedDecision(item.linkedDecisionId);
                    return (
                      <div key={item.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.duration}min{item.presenter && ` · ${item.presenter.name}`}</p>
                          </div>
                        </div>

                        {linked && (
                          <div className="ml-9 mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <GitBranch className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Bağlı Karar</span>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground">{linked.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{linked.description}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span>Bütçe: €{linked.budget.toLocaleString()}</span>
                                  <span>Risk: {linked.riskLevel}</span>
                                  <span>Oluşturan: {linked.createdBy.name}</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0 flex items-center gap-2">
                                <StatusBadge status={linked.status} />
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                            {linked.aiEvaluation && (
                              <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded p-2">
                                AI: {linked.aiEvaluation.summary.substring(0, 100)}…
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <MeetingRecordings meetingId={selectedMeeting.id} />

              <div className="enterprise-card">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground text-sm">Decisions Taken</h3>
                </div>
                {meetingDecisions.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No decisions recorded for this meeting.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {meetingDecisions.map((d) => (
                      <div key={d.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm text-foreground">{d.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">Budget: €{d.budget.toLocaleString()}</p>
                          </div>
                          <StatusBadge status={d.status} />
                        </div>
                        {d.aiEvaluation && (
                          <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded p-2">
                            AI: {d.aiEvaluation.summary.substring(0, 120)}…
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
