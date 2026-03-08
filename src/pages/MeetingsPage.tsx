import { meetings } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { useState } from 'react';

export default function MeetingsPage() {
  const [selectedMeeting, setSelectedMeeting] = useState(meetings[0]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Meeting Records</h1>
        <p className="page-description">Board and executive meeting logs with linked decisions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meeting List */}
        <div className="enterprise-card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">All Meetings</h3>
          </div>
          <div className="divide-y divide-border/50">
            {meetings.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMeeting(m)}
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

        {/* Meeting Detail */}
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
                <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{selectedMeeting.location}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" />{selectedMeeting.attendees.length} attendees</div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Chairperson:</span> {selectedMeeting.chairperson.name} ({selectedMeeting.chairperson.role})</p>
              </div>
            </div>

            {/* Agenda */}
            <div className="enterprise-card">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Agenda Items</h3>
              </div>
              <div className="divide-y divide-border/50">
                {selectedMeeting.agenda.map((item, i) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div>
                        <p className="font-medium text-sm text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.duration}min{item.presenter && ` · ${item.presenter.name}`}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decisions Taken */}
            <div className="enterprise-card">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Decisions Taken</h3>
              </div>
              {selectedMeeting.decisions.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No decisions recorded for this meeting.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {selectedMeeting.decisions.map((d) => (
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
    </div>
  );
}
