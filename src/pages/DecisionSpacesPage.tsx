import { Layers } from 'lucide-react';

const spaces = [
  { name: 'Engineering', decisions: 12, pending: 3, color: 'bg-primary/10 text-primary' },
  { name: 'Finance', decisions: 8, pending: 2, color: 'bg-success/10 text-success' },
  { name: 'Operations', decisions: 15, pending: 5, color: 'bg-warning/10 text-warning' },
  { name: 'Marketing', decisions: 6, pending: 1, color: 'bg-info/10 text-info' },
  { name: 'Board', decisions: 4, pending: 1, color: 'bg-destructive/10 text-destructive' },
];

export default function DecisionSpacesPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Decision Spaces</h1>
        <p className="page-description">Departmental and organizational decision workspaces.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spaces.map((s) => (
          <div key={s.name} className="enterprise-card p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 rounded-lg ${s.color} flex items-center justify-center`}>
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{s.name}</h3>
            </div>
            <div className="flex gap-6 text-sm">
              <div><span className="text-muted-foreground">Decisions:</span> <span className="font-medium text-foreground">{s.decisions}</span></div>
              <div><span className="text-muted-foreground">Pending:</span> <span className="font-medium text-warning">{s.pending}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
