import { Settings as SettingsIcon, User, Shield, Bell, Palette } from 'lucide-react';
import { currentUser } from '@/data/mockData';

export default function SettingsPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Configure your DecisionOS preferences.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="enterprise-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Profile</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border/50"><span className="text-muted-foreground">Name</span><span className="text-foreground">{currentUser.name}</span></div>
            <div className="flex justify-between py-2 border-b border-border/50"><span className="text-muted-foreground">Email</span><span className="text-foreground">{currentUser.email}</span></div>
            <div className="flex justify-between py-2 border-b border-border/50"><span className="text-muted-foreground">Role</span><span className="text-foreground">{currentUser.role}</span></div>
            <div className="flex justify-between py-2"><span className="text-muted-foreground">Department</span><span className="text-foreground">{currentUser.department}</span></div>
          </div>
        </div>

        <div className="enterprise-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
          </div>
          <div className="space-y-3 text-sm">
            {['New proposals', 'Approval requests', 'Meeting invites', 'AI evaluations complete'].map((item) => (
              <div key={item} className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">{item}</span>
                <div className="h-5 w-9 bg-primary rounded-full relative"><div className="h-4 w-4 bg-primary-foreground rounded-full absolute right-0.5 top-0.5" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
