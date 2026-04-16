import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Mail, Shield, Eye, CheckCircle, Trash2, Copy, Users } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  role: 'admin' | 'approver' | 'viewer';
  joined_at: string;
  profiles?: { display_name: string | null; department: string | null } | null;
}

interface Invite {
  id: string;
  email: string;
  role: 'admin' | 'approver' | 'viewer';
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

const roleLabels: Record<string, { label: string; icon: any; color: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'text-red-500' },
  approver: { label: 'Approver', icon: CheckCircle, color: 'text-amber-500' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-blue-500' },
};

export default function TeamPage() {
  const { workspace, role } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'approver' | 'viewer'>('viewer');
  const [sending, setSending] = useState(false);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (workspace) {
      fetchMembers();
      if (isAdmin) fetchInvites();
    }
  }, [workspace, role]);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('workspace_members')
      .select('id, user_id, role, joined_at')
      .eq('workspace_id', workspace!.id)
      .order('joined_at');

    if (data) {
      // Fetch profiles separately
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, department')
        .in('user_id', userIds);

      const merged = data.map((m: any) => ({
        ...m,
        profiles: profiles?.find((p: any) => p.user_id === m.user_id) || null,
      }));
      setMembers(merged);
    }
  };

  const fetchInvites = async () => {
    const { data } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspace!.id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (data) setInvites(data as Invite[]);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !inviteEmail.trim()) return;
    setSending(true);

    const { data, error } = await supabase
      .from('workspace_invites')
      .insert({
        workspace_id: workspace.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: user!.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Bu e-posta zaten davet edilmiş.', variant: 'destructive' });
      } else {
        toast({ title: 'Davet hatası', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Davet oluşturuldu', description: `${inviteEmail} adresine davet linki hazır.` });
      setInviteEmail('');
      fetchInvites();
    }
    setSending(false);
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Davet linki kopyalandı!' });
  };

  const deleteInvite = async (id: string) => {
    await supabase.from('workspace_invites').delete().eq('id', id);
    fetchInvites();
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', memberId);
    fetchMembers();
    toast({ title: 'Rol güncellendi' });
  };

  const removeMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast({ title: 'Kendinizi çıkaramazsınız.', variant: 'destructive' });
      return;
    }
    await supabase.from('workspace_members').delete().eq('id', memberId);
    fetchMembers();
    toast({ title: 'Üye çıkarıldı' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Takım Yönetimi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {workspace?.name} workspace üyelerini yönetin.
        </p>
      </div>

      {/* Invite Form (Admin only) */}
      {isAdmin && (
        <div className="enterprise-card p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Takım Üyesi Davet Et
          </h3>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="ornek@sirket.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="approver">Approver</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={sending}>
              <Mail className="h-4 w-4 mr-1" />
              Davet Et
            </Button>
          </form>
        </div>
      )}

      {/* Pending Invites (Admin only) */}
      {isAdmin && invites.length > 0 && (
        <div className="enterprise-card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Bekleyen Davetler</h3>
          </div>
          <div className="divide-y divide-border/50">
            {invites.map((inv) => {
              const RoleIcon = roleLabels[inv.role]?.icon;
              return (
                <div key={inv.id} className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <RoleIcon className={`h-3 w-3 ${roleLabels[inv.role].color}`} />
                      {roleLabels[inv.role].label} · Süre: {new Date(inv.expires_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyInviteLink(inv.token)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteInvite(inv.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="enterprise-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Üyeler ({members.length})
          </h3>
        </div>
        <div className="divide-y divide-border/50">
          {members.map((m) => {
            const RoleIcon = roleLabels[m.role]?.icon;
            const isCurrentUser = m.user_id === user?.id;
            return (
              <div key={m.id} className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold text-sm">
                    {(m.profiles?.display_name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.profiles?.display_name || 'Adsız Kullanıcı'}
                    {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(Siz)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RoleIcon className={`h-3 w-3 ${roleLabels[m.role].color}`} />
                    {roleLabels[m.role].label}
                    {m.profiles?.department && ` · ${m.profiles.department}`}
                  </p>
                </div>
                {isAdmin && !isCurrentUser && (
                  <div className="flex items-center gap-1">
                    <Select
                      value={m.role}
                      onValueChange={(v) => updateMemberRole(m.id, v)}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="approver">Approver</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeMember(m.id, m.user_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
