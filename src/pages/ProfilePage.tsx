import { useLanguage, translate } from "@/contexts/LanguageContext";
import { useEffect, useRef, useState } from 'react';
import { User, Upload, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, department, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setDisplayName(data.display_name ?? '');
        setDepartment(data.department ?? '');
        setAvatarUrl(data.avatar_url ?? null);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: translate("Geçersiz dosya"), description: translate("Lütfen bir resim dosyası seçin."), variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: translate("Dosya çok büyük"), description: translate("Maksimum 5MB."), variant: 'destructive' });
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      toast({ title: translate("Yükleme başarısız"), description: upErr.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const newUrl = pub.publicUrl;

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ avatar_url: newUrl })
      .eq('user_id', user.id);

    if (updErr) {
      toast({ title: translate("Profil güncellenemedi"), description: updErr.message, variant: 'destructive' });
    } else {
      setAvatarUrl(newUrl);
      toast({ title: translate("Avatar güncellendi") });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        department: department.trim() || null,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: translate("Kaydedilemedi"), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: translate("Profil kaydedildi") });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = (displayName || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{translate("Profil")}</h1>
        <p className="page-description">{translate("Adınızı, departmanınızı ve avatarınızı yönetin.")}</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="enterprise-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">{translate("Profil Bilgileri")}</h3>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <Avatar className="h-20 w-20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {translate("Yükleniyor…")}</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> {translate("Avatar Yükle")}</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">{translate("PNG, JPG · Maks 5MB")}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{translate("E-posta")}</Label>
              <Input id="email" value={user?.email ?? ''} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{translate("İsim")}</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={translate("Adınız Soyadınız")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">{translate("Departman")}</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder={translate("Örn: Finans, Operasyon, Ürün")}
              />
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {translate("Kaydediliyor…")}</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> {translate("Değişiklikleri Kaydet")}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
