import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'creating'>('form');
  const { user } = useAuth();
  const { refetch } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyName.trim()) return;

    setLoading(true);
    setStep('creating');

    // Create workspace
    const { data: ws, error: wsError } = await supabase
      .from('workspaces')
      .insert({ name: companyName.trim(), created_by: user.id })
      .select()
      .single();

    if (wsError || !ws) {
      toast({ title: 'Hata', description: wsError?.message || 'Workspace oluşturulamadı.', variant: 'destructive' });
      setStep('form');
      setLoading(false);
      return;
    }

    // Add user as admin member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: ws.id, user_id: user.id, role: 'admin' });

    if (memberError) {
      toast({ title: 'Hata', description: memberError.message, variant: 'destructive' });
      setStep('form');
      setLoading(false);
      return;
    }

    // Update profile with workspace_id
    await supabase
      .from('profiles')
      .update({ workspace_id: ws.id })
      .eq('user_id', user.id);

    // Wait briefly for visual effect
    await new Promise((r) => setTimeout(r, 1500));

    await refetch();
    navigate('/', { replace: true });
  };

  if (step === 'creating') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Workspace oluşturuluyor...
            </h2>
            <p className="text-muted-foreground text-sm">
              <span className="font-medium text-foreground">{companyName}</span> için her şey hazırlanıyor.
            </p>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Hoş geldiniz!</h1>
          <p className="text-muted-foreground text-sm">
            Başlamak için şirketinizin workspace'ini oluşturun.
          </p>
        </div>

        <div className="enterprise-card p-6">
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="companyName">Şirket Adı</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="pl-10"
                  required
                  maxLength={100}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !companyName.trim()}>
              Workspace Oluştur
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
