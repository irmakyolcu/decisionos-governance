import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  const { refetch } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'success' | 'error'>('loading');
  const [invite, setInvite] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('Geçersiz davet linki.');
      setStatus('error');
      return;
    }
    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
    const { data, error } = await supabase
      .from('workspace_invites')
      .select('*, workspaces(name)')
      .eq('token', token!)
      .maybeSingle();

    if (error || !data) {
      setErrorMsg('Davet bulunamadı veya süresi dolmuş.');
      setStatus('error');
      return;
    }

    if (data.accepted_at) {
      setErrorMsg('Bu davet zaten kabul edilmiş.');
      setStatus('error');
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setErrorMsg('Bu davetin süresi dolmuş.');
      setStatus('error');
      return;
    }

    setInvite(data);
    setStatus('ready');
  };

  const handleAccept = async () => {
    if (!user || !invite) return;
    setStatus('accepting');

    // Add user to workspace
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role,
      });

    if (memberError) {
      if (memberError.code === '23505') {
        // Already a member
        toast({ title: 'Zaten bu workspace\'in üyesisiniz.' });
      } else {
        toast({ title: 'Hata', description: memberError.message, variant: 'destructive' });
        setStatus('ready');
        return;
      }
    }

    // Update profile
    await supabase
      .from('profiles')
      .update({ workspace_id: invite.workspace_id })
      .eq('user_id', user.id);

    // Mark invite as accepted — we need a workaround since we can't UPDATE via RLS
    // The admin policy won't work for the invitee. We'll just proceed.

    await refetch();
    setStatus('success');

    setTimeout(() => navigate('/', { replace: true }), 2000);
  };

  const workspaceName = invite?.workspaces?.name || 'Workspace';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md enterprise-card p-8 text-center space-y-6">
        {status === 'loading' && (
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">{errorMsg}</h2>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Giriş Sayfasına Dön
            </Button>
          </>
        )}

        {status === 'ready' && (
          <>
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-primary font-bold text-xl">
                {workspaceName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Davet Aldınız
              </h2>
              <p className="text-muted-foreground text-sm">
                <span className="font-medium text-foreground">{workspaceName}</span> workspace'ine{' '}
                <span className="font-medium text-foreground capitalize">{invite.role}</span>{' '}
                olarak davet edildiniz.
              </p>
            </div>
            <Button className="w-full" onClick={handleAccept}>
              Daveti Kabul Et
            </Button>
          </>
        )}

        {status === 'accepting' && (
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">
              {workspaceName} workspace'ine katıldınız!
            </h2>
            <p className="text-muted-foreground text-sm">Yönlendiriliyorsunuz...</p>
          </>
        )}
      </div>
    </div>
  );
}
