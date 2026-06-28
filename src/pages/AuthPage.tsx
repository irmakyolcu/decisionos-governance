import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: 'Giriş hatası', description: error.message, variant: 'destructive' });
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { company_name: companyName },
        },
      });
      if (error) {
        toast({ title: 'Kayıt hatası', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Kayıt başarılı', description: 'Yönlendiriliyorsunuz...' });
      }
    }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: 'Google giriş hatası', description: String(result.error), variant: 'destructive' });
    }
    if (result.redirected) return;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a1a] p-4 sm:p-6 font-sans">
      <div className="relative w-full max-w-5xl flex flex-col md:flex-row bg-[#141432] rounded-3xl overflow-hidden border border-[#1e1e5a] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">

        {/* Left: brand panel */}
        <div className="hidden md:flex md:w-5/12 relative bg-[#0a0a1a] p-12 flex-col justify-between overflow-hidden border-r border-[#1e1e5a]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#4f46e5] rounded-full blur-[120px] opacity-20 -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1e1e5a] rounded-full blur-[100px] opacity-30 -ml-40 -mb-40" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-12">
              <div className="w-8 h-8 bg-[#4f46e5] rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                <div className="w-4 h-4 border-2 border-white rounded-sm" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">DecisionOS</span>
            </div>

            <h1 className="text-4xl font-semibold text-white leading-tight tracking-tight">
              Modern yönetim kurulu için <br />
              <span className="text-[#4f46e5]">karar zekâsı.</span>
            </h1>
            <p className="mt-6 text-[#94a3b8] text-lg leading-relaxed max-w-xs">
              Yönetici ekipleri için denetlenebilir, AI destekli karar altyapısı.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#141432] bg-[#1e1e5a]" />
              <div className="w-8 h-8 rounded-full border-2 border-[#141432] bg-[#4f46e5]" />
              <div className="w-8 h-8 rounded-full border-2 border-[#141432] bg-[#1e1e5a]" />
            </div>
            <span className="text-xs text-[#64748b] uppercase tracking-widest font-medium italic">
              Audit-grade · SOC2-ready
            </span>
          </div>
        </div>

        {/* Right: form */}
        <div className="flex-1 p-8 md:p-16 flex flex-col justify-center bg-[#141432]">
          <div className="w-full max-w-sm mx-auto">
            <div className="md:hidden flex items-center justify-center gap-2 mb-8">
              <div className="w-7 h-7 bg-[#4f46e5] rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                <div className="w-3.5 h-3.5 border-2 border-white rounded-sm" />
              </div>
              <span className="text-lg font-bold text-white">DecisionOS</span>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-[#0a0a1a] rounded-xl border border-[#1e1e5a] mb-8">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  isLogin ? 'text-white bg-[#1e1e5a] shadow-sm' : 'text-[#64748b] hover:text-white'
                }`}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  !isLogin ? 'text-white bg-[#1e1e5a] shadow-sm' : 'text-[#64748b] hover:text-white'
                }`}
              >
                Hesap Oluştur
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Şirket Adı</label>
                  <input
                    type="text"
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required={!isLogin}
                    maxLength={100}
                    className="w-full px-4 py-3 bg-[#0a0a1a] border border-[#1e1e5a] rounded-xl text-white placeholder-[#334155] focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">İş E-postası</label>
                <input
                  type="email"
                  placeholder="isim@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0a0a1a] border border-[#1e1e5a] rounded-xl text-white placeholder-[#334155] focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Şifre</label>
                  {isLogin && (
                    <a href="#" className="text-xs font-medium text-[#4f46e5] hover:text-[#6366f1] transition-colors">Şifremi unuttum</a>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-[#0a0a1a] border border-[#1e1e5a] rounded-xl text-white placeholder-[#334155] focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#4f46e5] hover:bg-[#6366f1] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#1e1e5a]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
                <span className="bg-[#141432] px-3 text-[#64748b]">veya</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full py-3 flex items-center justify-center gap-3 bg-[#0a0a1a] hover:bg-[#1e1e5a]/40 border border-[#1e1e5a] text-white font-medium rounded-xl transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google ile devam et
            </button>

            <div className="mt-8 pt-6 border-t border-[#1e1e5a] text-center">
              <p className="text-xs text-[#475569] leading-relaxed">
                Devam ederek{' '}
                <a href="#" className="text-[#64748b] hover:text-white underline underline-offset-4">Hizmet Şartları</a>{' '}
                ve{' '}
                <a href="#" className="text-[#64748b] hover:text-white underline underline-offset-4">Veri Yönetişimi Politikası</a>
                'nı kabul etmiş olursunuz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
