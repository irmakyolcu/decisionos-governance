import { useLanguage, translate } from "@/contexts/LanguageContext";
import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, User, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  useLanguage();
  const { user } = useAuth();
  const { role } = useWorkspace();
  const [profile, setProfile] = useState<{ display_name: string | null; department: string | null; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, department, role').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setProfile(data); setLoading(false); });
  }, [user]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{translate("Settings")}</h1>
        <p className="page-description">{translate("Configure your DecisionOS preferences.")}</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="enterprise-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">{translate("Profile")}</h3>
          </div>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50"><span className="text-muted-foreground">{translate("Name")}</span><span className="text-foreground">{profile?.display_name ?? '—'}</span></div>
              <div className="flex justify-between py-2 border-b border-border/50"><span className="text-muted-foreground">{translate("Email")}</span><span className="text-foreground">{user?.email ?? '—'}</span></div>
              <div className="flex justify-between py-2 border-b border-border/50"><span className="text-muted-foreground">{translate("Workspace Role")}</span><span className="text-foreground capitalize">{role ?? '—'}</span></div>
              <div className="flex justify-between py-2"><span className="text-muted-foreground">{translate("Department")}</span><span className="text-foreground">{profile?.department ?? '—'}</span></div>
            </div>
          )}
        </div>

        <div className="enterprise-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">{translate("Notifications")}</h3>
          </div>
          <div className="space-y-3 text-sm">
            {['New proposals', 'Approval requests', 'Meeting invites', 'AI evaluations complete'].map((item) => (
              <div key={translate(item)} className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">{translate(item)}</span>
                <div className="h-5 w-9 bg-primary rounded-full relative"><div className="h-4 w-4 bg-primary-foreground rounded-full absolute right-0.5 top-0.5" /></div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{translate("Notification preferences coming soon.")}</p>
        </div>
      </div>
    </div>
  );
}
