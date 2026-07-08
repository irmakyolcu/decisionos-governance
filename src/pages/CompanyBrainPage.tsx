import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Building2, FolderKanban, Workflow, Zap, AlertTriangle, GitBranch, FileText, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CompanyBrainPage() {
  const { workspace } = useWorkspace();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!workspace) return;
    (async () => {
      const t = ['clients','projects','processes','company_skills','risks','decisions','uploaded_documents','knowledge_items','data_sources'];
      const res = await Promise.all(t.map((tbl) =>
        supabase.from(tbl as any).select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id)
      ));
      const c: Record<string, number> = {};
      t.forEach((tbl, i) => { c[tbl] = res[i].count ?? 0; });
      setCounts(c);
    })();
  }, [workspace]);

  const entities = [
    { label: 'Clients', key: 'clients', icon: Building2, href: '/clients' },
    { label: 'Projects', key: 'projects', icon: FolderKanban, href: '/projects' },
    { label: 'Decisions', key: 'decisions', icon: GitBranch, href: '/decisions' },
    { label: 'Processes', key: 'processes', icon: Workflow, href: '/processes' },
    { label: 'Company Skills', key: 'company_skills', icon: Zap, href: '/skills' },
    { label: 'Risks', key: 'risks', icon: AlertTriangle, href: '/risks' },
    { label: 'Documents', key: 'uploaded_documents', icon: FileText, href: '/data-sources' },
    { label: 'Knowledge Items', key: 'knowledge_items', icon: Brain, href: '/brain' },
    { label: 'Data Sources', key: 'data_sources', icon: Database, href: '/data-sources' },
  ];

  const health = [
    { label: 'Knowledge coverage', v: 62 },
    { label: 'Decision traceability', v: 78 },
    { label: 'Information freshness', v: 54 },
    { label: 'Ownership clarity', v: 71 },
    { label: 'Permission safety', v: 92 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Brain</h1>
        <p className="text-sm text-muted-foreground">Structured view of every entity in your organization.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Brain Health</h2>
          <Badge variant="secondary">Overall 71</Badge>
        </div>
        <div className="grid sm:grid-cols-5 gap-4">
          {health.map((h) => (
            <div key={h.label}>
              <div className="text-xs text-muted-foreground mb-1">{h.label}</div>
              <div className="text-lg font-semibold">{h.v}%</div>
              <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${h.v}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h2 className="font-semibold mb-3">Entities</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {entities.map((e) => (
            <Link key={e.key} to={e.href}>
              <Card className="p-4 hover:border-primary/40 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <e.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{e.label}</div>
                    <div className="text-xs text-muted-foreground">{counts[e.key] ?? 0} items</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
