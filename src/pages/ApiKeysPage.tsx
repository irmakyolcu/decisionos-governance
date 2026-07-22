import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, KeyRound, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const ALL_SCOPES = [
  'decisions:read', 'decisions:write',
  'lessons:read', 'lessons:write',
  'knowledge:read', 'knowledge:write',
  'notifications:read', 'audit:read',
];

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  return `dos_${b64}`;
}

interface Key {
  id: string; name: string; prefix: string; role: string; scopes: string[];
  created_at: string; last_used_at: string | null; revoked_at: string | null;
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { workspace, role } = useWorkspace();
  const isAdmin = role === 'admin';
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', role: 'viewer', scopes: ['decisions:read'] as string[] });

  const load = async () => {
    if (!workspace) return;
    setLoading(true);
    const { data } = await (supabase as any).from('api_keys').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
    setKeys(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [workspace?.id]);

  const create = async () => {
    if (!workspace || !user || !form.name.trim()) return;
    const raw = generateKey();
    const key_hash = await sha256Hex(raw);
    const prefix = raw.slice(0, 12);
    const { error } = await (supabase as any).from('api_keys').insert({
      workspace_id: workspace.id, name: form.name.trim(), prefix, key_hash,
      role: form.role, scopes: form.scopes, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    setNewKey(raw);
    setForm({ name: '', role: 'viewer', scopes: ['decisions:read'] });
    load();
  };

  const revoke = async (id: string) => {
    if (!confirm('Bu anahtarı iptal etmek istediğinize emin misiniz?')) return;
    const { error } = await (supabase as any).from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('İptal edildi');
    load();
  };

  const toggleScope = (s: string) =>
    setForm((f) => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s] }));

  if (!isAdmin) {
    return (
      <div className="p-6"><Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
        <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-warning" />
        Sadece workspace admin'leri API anahtarlarını yönetebilir.
      </CardContent></Card></div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary" />API Anahtarları</h1>
          <p className="text-sm text-muted-foreground mt-1">Dışarıdaki sistemlerin DecisionOS ile veri alışverişi yapması için anahtar oluşturun.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setNewKey(null); }}>
          <DialogTrigger asChild><Button>Yeni Anahtar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{newKey ? 'Anahtarınız hazır' : 'API Anahtarı Oluştur'}</DialogTitle></DialogHeader>
            {newKey ? (
              <div className="space-y-3">
                <p className="text-sm text-warning">Bu değer bir daha gösterilmeyecek. Güvenli bir yere kaydedin.</p>
                <div className="flex gap-2">
                  <Input readOnly value={newKey} className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Kopyalandı'); }}><Copy className="h-4 w-4" /></Button>
                </div>
                <Button className="w-full" onClick={() => { setOpen(false); setNewKey(null); }}>Tamam</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div><Label>Ad</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Örn: Zapier entegrasyonu" /></div>
                <div><Label>Rol</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer (sadece okuma)</SelectItem>
                      <SelectItem value="writer">Writer (okuma + yazma)</SelectItem>
                      <SelectItem value="admin">Admin (tam erişim)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Scope'lar</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {ALL_SCOPES.map((s) => (
                      <label key={s} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={form.scopes.includes(s)} onCheckedChange={() => toggleScope(s)} />
                        <span className="font-mono">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={create} disabled={!form.name.trim() || form.scopes.length === 0}>Oluştur</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Endpoint</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input readOnly value={API_BASE} className="font-mono text-xs" />
            <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(API_BASE); toast.success('Kopyalandı'); }}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">Anahtarınızı <code className="bg-muted px-1 rounded">X-API-Key</code> header'ında gönderin. Detay için <code className="bg-muted px-1 rounded">GET {API_BASE}/v1</code></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Aktif Anahtarlar</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p>
            : keys.length === 0 ? <p className="text-sm text-muted-foreground">Henüz anahtar yok.</p>
            : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{k.name}</span>
                        <Badge variant="outline" className="text-[10px]">{k.role}</Badge>
                        {k.revoked_at && <Badge variant="destructive" className="text-[10px]">İptal edildi</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{k.prefix}…</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {k.scopes.join(' · ')} · Son kullanım: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'hiç'}
                      </div>
                    </div>
                    {!k.revoked_at && (
                      <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
