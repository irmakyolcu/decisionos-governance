import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, RefreshCw, LogOut, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const { refetch } = useWorkspace();
  const navigate = useNavigate();
  const [link, setLink] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const openInvitation = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const url = new URL(link.trim(), window.location.origin);
      if (url.origin !== window.location.origin || url.pathname !== '/invite' || !url.searchParams.get('token')) {
        setError(true);
        return;
      }
      setError(false);
      navigate(`/invite${url.search}`);
    } catch {
      setError(true);
    }
  };

  const checkAccess = async () => {
    setChecking(true);
    try { await refetch(); } finally { setChecking(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end"><LanguageToggle /></div>
        <ShieldCheck className="h-12 w-12 text-primary" />
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">DecisionOS</p>
          <h1 className="text-2xl font-semibold text-foreground">{t('signup.approvalTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('signup.approvalDescription')}</p>
        </div>
        <form onSubmit={openInvitation} className="space-y-3">
          <Label htmlFor="invitation-link">{t('signup.inviteLink')}</Label>
          <Input id="invitation-link" value={link} onChange={event => { setLink(event.target.value); setError(false); }} required />
          {error && <p role="alert" className="text-sm text-destructive">{t('signup.invalidInvite')}</p>}
          <Button type="submit" className="w-full" disabled={!link.trim()}><ArrowRight className="mr-2 h-4 w-4" />{t('signup.openInvite')}</Button>
        </form>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={checkAccess} disabled={checking}><RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />{t('signup.refresh')}</Button>
          <Button variant="ghost" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />{t('signup.signOut')}</Button>
        </div>
      </div>
    </div>
  );
}