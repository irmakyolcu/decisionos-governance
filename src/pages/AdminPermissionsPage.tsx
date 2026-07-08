import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ScrollText } from 'lucide-react';

export default function AdminPermissionsPage() {
  const { workspace, role } = useWorkspace();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!workspace) return;
    supabase.from('audit_logs').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(50).then(({ data }) => setLogs(data ?? []));
  }, [workspace]);

  if (role !== 'admin') {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Admin & Permissions</h1><p className="text-sm text-muted-foreground">Workspace settings, permissions, audit log.</p></div>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Permission Model</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Admin</span><Badge>Full access</Badge></div>
          <div className="flex justify-between"><span>Approver</span><Badge variant="secondary">Read + write, no admin</Badge></div>
          <div className="flex justify-between"><span>Viewer</span><Badge variant="outline">Read-only, respects confidentiality</Badge></div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-3"><ScrollText className="h-4 w-4" /><h2 className="font-semibold">Audit Log</h2></div>
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">No events yet.</p> : (
          <div className="space-y-1 text-xs">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div><span className="font-medium">{l.action}</span> {l.entity_type && <span className="text-muted-foreground">on {l.entity_type}</span>}</div>
                <div className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
