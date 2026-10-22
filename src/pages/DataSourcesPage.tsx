import { useLanguage, translate } from "@/contexts/LanguageContext";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Database, FileText, Loader2, Sparkles, Globe, Plus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ACCEPTS = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.json,.xml,.log,.rtf,.html,.htm,.png,.jpg,.jpeg,.webp,.gif,.tiff,.mp3,.wav,.m4a,.ogg';

const CONNECTORS = [
  { kind: 'gmail', label: 'Gmail' }, { kind: 'outlook', label: 'Outlook' },
  { kind: 'slack', label: 'Slack' }, { kind: 'teams', label: 'Microsoft Teams' },
  { kind: 'drive', label: 'Google Drive' }, { kind: 'sharepoint', label: 'SharePoint' },
  { kind: 'notion', label: 'Notion' }, { kind: 'hubspot', label: 'HubSpot' },
  { kind: 'salesforce', label: 'Salesforce' }, { kind: 'jira', label: 'Jira' },
  { kind: 'linear', label: 'Linear' }, { kind: 'github', label: 'GitHub' },
  { kind: 'zoom', label: 'Zoom' },
];

export default function DataSourcesPage() {
  useLanguage();
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [sources, setSources] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', content_text: '', confidentiality: 'internal', mime_type: 'text/plain' });
  const [file, setFile] = useState<File | null>(null);
  const [apiOpen, setApiOpen] = useState(false);
  const [apiFetching, setApiFetching] = useState(false);
  const [apiForm, setApiForm] = useState({
    title: '', url: '', method: 'GET', headers: '', body: '', confidentiality: 'internal',
    authType: 'none' as 'none' | 'bearer' | 'api_key' | 'basic',
    authToken: '',
    apiKeyName: 'X-API-Key', apiKeyValue: '', apiKeyLocation: 'header' as 'header' | 'query',
    basicUser: '', basicPass: '',
  });

  const load = async () => {
    if (!workspace) return;
    const { data: s } = await supabase.from('data_sources').select('*').eq('workspace_id', workspace.id);
    setSources(s ?? []);
    const { data: d } = await supabase.from('uploaded_documents').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(20);
    setDocs(d ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const upload = async () => {
    if (!workspace || !user || !form.title) return;
    setUploading(true);
    try {
      let filePath: string | null = null;
      if (file) {
        const path = `${workspace.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('company-docs').upload(path, file);
        if (upErr) throw upErr;
        filePath = path;
      }
      const contentText = form.content_text || (file && file.type.startsWith('text/') ? await file.text() : '');
      const { data: doc, error } = await supabase.from('uploaded_documents').insert({
        workspace_id: workspace.id, created_by: user.id,
        title: form.title, file_path: filePath, content_text: contentText,
        mime_type: file?.type || form.mime_type,
        confidentiality: form.confidentiality as any,
        process_status: contentText ? 'indexed' : (filePath ? 'processing' : 'indexed'),
      }).select().single();
      if (error) throw error;

      if (contentText && doc) {
        await supabase.from('knowledge_items').insert({
          workspace_id: workspace.id, created_by: user.id, document_id: doc.id,
          title: form.title, content: contentText.slice(0, 5000),
          summary: contentText.slice(0, 300),
          confidentiality: form.confidentiality as any,
          source_date: new Date().toISOString(),
        });
      } else if (doc && filePath) {
        // Trigger AI extraction in background
        supabase.functions.invoke('ingest-document', { body: { document_id: doc.id } })
          .then(() => load())
          .catch(() => void 0);
      }
      toast({ title: translate("Yüklendi"), description: contentText ? 'Doküman indekslendi.' : 'Doküman yüklendi; AI ile içerik çıkarılıyor…' });
      setUploadOpen(false); setFile(null); setForm({ title: '', content_text: '', confidentiality: 'internal', mime_type: 'text/plain' });
      load();
    } catch (e: any) {
      toast({ title: translate("Upload failed"), description: e.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const reingest = async (id: string) => {
    toast({ title: translate("AI çıkarımı başladı"), description: translate("Bir kaç saniye sürebilir.") });
    const { error } = await supabase.functions.invoke('ingest-document', { body: { document_id: id } });
    if (error) toast({ title: translate("Hata"), description: error.message, variant: 'destructive' });
    else { toast({ title: translate("Bitti"), description: translate("İçerik güncellendi.") }); load(); }
  };

  const addConnector = async (kind: string, label: string) => {
    if (!workspace || !user) return;
    const { error } = await supabase.from('data_sources').insert({
      workspace_id: workspace.id, created_by: user.id, kind: kind as any, label, status: 'coming_soon',
    });
    if (error) return toast({ title: translate("Error"), description: error.message, variant: 'destructive' });
    load();
  };

  const fetchApi = async () => {
    if (!workspace || !apiForm.url) return;
    setApiFetching(true);
    try {
      let headers: Record<string, string> = {};
      if (apiForm.headers.trim()) {
        try { headers = JSON.parse(apiForm.headers); } catch { throw new Error('Headers geçerli JSON değil'); }
      }
      const body = apiForm.body.trim() ? apiForm.body : undefined;
      let auth: any = null;
      if (apiForm.authType === 'bearer' && apiForm.authToken) auth = { type: 'bearer', token: apiForm.authToken };
      else if (apiForm.authType === 'api_key' && apiForm.apiKeyName && apiForm.apiKeyValue)
        auth = { type: 'api_key', key_name: apiForm.apiKeyName, key_value: apiForm.apiKeyValue, location: apiForm.apiKeyLocation };
      else if (apiForm.authType === 'basic' && apiForm.basicUser)
        auth = { type: 'basic', username: apiForm.basicUser, password: apiForm.basicPass };
      const { data, error } = await supabase.functions.invoke('fetch-api-source', {
        body: {
          workspace_id: workspace.id,
          title: apiForm.title || undefined,
          url: apiForm.url,
          method: apiForm.method,
          headers,
          body,
          confidentiality: apiForm.confidentiality,
          auth,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: translate("API çekildi"), description: `${(data as any).length} karakter indekslendi.` });
      setApiOpen(false);
      setApiForm({
        title: '', url: '', method: 'GET', headers: '', body: '', confidentiality: 'internal',
        authType: 'none', authToken: '',
        apiKeyName: 'X-API-Key', apiKeyValue: '', apiKeyLocation: 'header',
        basicUser: '', basicPass: '',
      });
      load();
    } catch (e: any) {
      toast({ title: translate("API çekilemedi"), description: e.message, variant: 'destructive' });
    } finally { setApiFetching(false); }
  };

  const refreshApi = async (source: any) => {
    const cfg = source.config || {};
    if (!cfg.url) return toast({ title: translate("URL yok"), variant: 'destructive' });
    setApiFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-api-source', {
        body: { workspace_id: workspace!.id, title: source.label, url: cfg.url, method: cfg.method || 'GET', auth: cfg.auth ?? null },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any).error);
      toast({ title: translate("Yenilendi") });
      load();
    } catch (e: any) {
      toast({ title: translate("Hata"), description: e.message, variant: 'destructive' });
    } finally { setApiFetching(false); }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{translate("Data Sources")}</h1><p className="text-sm text-muted-foreground">{translate("Connect systems and upload knowledge.")}</p></div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild><Button><Upload className="h-4 w-4 mr-2" />{translate("Upload")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{translate("Upload Knowledge")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{translate("Title")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>{translate("Dosya (PDF, DOCX, XLSX, CSV, TXT, resim, ses, vb.)")}</Label><Input type="file" accept={ACCEPTS} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              <div><Label>{translate("Or paste content")}</Label><Textarea rows={5} value={form.content_text} onChange={(e) => setForm({ ...form, content_text: e.target.value })} /></div>
              <div><Label>{translate("Confidentiality")}</Label>
                <Select value={form.confidentiality} onValueChange={(v) => setForm({ ...form, confidentiality: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public_internal">{translate("Public internal")}</SelectItem>
                    <SelectItem value="internal">{translate("Internal")}</SelectItem>
                    <SelectItem value="confidential">{translate("Confidential")}</SelectItem>
                    <SelectItem value="highly_confidential">{translate("Highly confidential")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={upload} className="w-full" disabled={uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{translate("Uploading")}</> : translate("Upload & Index")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <h2 className="font-semibold mb-3">{translate("Connectors")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {CONNECTORS.map((c) => {
            const existing = sources.find((s) => s.kind === c.kind);
            return (
              <Card key={c.kind} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{translate(c.label)}</div>
                  <div className="text-[10px] text-muted-foreground">{existing ? existing.status : translate("Not connected")}</div>
                </div>
                {existing ? <Badge variant="secondary" className="text-[10px]">{translate("Soon")}</Badge>
                  : <Button size="sm" variant="outline" onClick={() => addConnector(c.kind, c.label)}>{translate("Add")}</Button>}
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> {translate("API Endpoints")}</h2>
            <p className="text-xs text-muted-foreground">{translate("Harici REST API'lerden veri çekip Company Brain'e indeksle.")}</p>
          </div>
          <Dialog open={apiOpen} onOpenChange={setApiOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" />{translate("API ekle")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{translate("API Endpoint Bağla")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{translate("Başlık (opsiyonel)")}</Label><Input value={apiForm.title} onChange={(e) => setApiForm({ ...apiForm, title: e.target.value })} placeholder={translate("ör. CRM müşteri listesi")} /></div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <div>
                    <Label>{translate("Method")}</Label>
                    <Select value={apiForm.method} onValueChange={(v) => setApiForm({ ...apiForm, method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>URL</Label><Input value={apiForm.url} onChange={(e) => setApiForm({ ...apiForm, url: e.target.value })} placeholder="https://api.example.com/v1/data" /></div>
                </div>
                <div>
                  <Label>{translate("Headers (JSON, opsiyonel)")}</Label>
                  <Textarea rows={3} value={apiForm.headers} onChange={(e) => setApiForm({ ...apiForm, headers: e.target.value })} placeholder='{"Authorization": "Bearer ..."}' className="font-mono text-xs" />
                </div>
                {apiForm.method !== 'GET' && (
                  <div>
                    <Label>{translate("Body (opsiyonel)")}</Label>
                    <Textarea rows={3} value={apiForm.body} onChange={(e) => setApiForm({ ...apiForm, body: e.target.value })} className="font-mono text-xs" />
                  </div>
                )}
                <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                  <Label className="text-xs uppercase tracking-wide">{translate("Kimlik Doğrulama")}</Label>
                  <Select value={apiForm.authType} onValueChange={(v: any) => setApiForm({ ...apiForm, authType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{translate("Yok (Public)")}</SelectItem>
                      <SelectItem value="bearer">Bearer Token (OAuth / JWT)</SelectItem>
                      <SelectItem value="api_key">{translate("API Key")}</SelectItem>
                      <SelectItem value="basic">{translate("Basic Auth")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {apiForm.authType === 'bearer' && (
                    <div>
                      <Label className="text-xs">{translate("Access / Bearer Token")}</Label>
                      <Input type="password" value={apiForm.authToken} onChange={(e) => setApiForm({ ...apiForm, authToken: e.target.value })} placeholder={translate("eyJhbGciOi... veya ya29...")} className="font-mono text-xs" />
                      <p className="text-[10px] text-muted-foreground mt-1">{translate("İsteğe")} <code>Authorization: Bearer &lt;token&gt;</code> {translate("olarak eklenir.")}</p>
                    </div>
                  )}
                  {apiForm.authType === 'api_key' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_110px] gap-2">
                        <div>
                          <Label className="text-xs">{translate("Key adı")}</Label>
                          <Input value={apiForm.apiKeyName} onChange={(e) => setApiForm({ ...apiForm, apiKeyName: e.target.value })} placeholder="X-API-Key" className="font-mono text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs">{translate("Konum")}</Label>
                          <Select value={apiForm.apiKeyLocation} onValueChange={(v: any) => setApiForm({ ...apiForm, apiKeyLocation: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="header">{translate("Header")}</SelectItem>
                              <SelectItem value="query">{translate("Query")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">{translate("Key değeri")}</Label>
                        <Input type="password" value={apiForm.apiKeyValue} onChange={(e) => setApiForm({ ...apiForm, apiKeyValue: e.target.value })} className="font-mono text-xs" />
                      </div>
                    </div>
                  )}
                  {apiForm.authType === 'basic' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">{translate("Kullanıcı adı")}</Label>
                        <Input value={apiForm.basicUser} onChange={(e) => setApiForm({ ...apiForm, basicUser: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">{translate("Parola")}</Label>
                        <Input type="password" value={apiForm.basicPass} onChange={(e) => setApiForm({ ...apiForm, basicPass: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
                <div><Label>{translate("Confidentiality")}</Label>
                  <Select value={apiForm.confidentiality} onValueChange={(v) => setApiForm({ ...apiForm, confidentiality: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public_internal">{translate("Public internal")}</SelectItem>
                      <SelectItem value="internal">{translate("Internal")}</SelectItem>
                      <SelectItem value="confidential">{translate("Confidential")}</SelectItem>
                      <SelectItem value="highly_confidential">{translate("Highly confidential")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={fetchApi} disabled={apiFetching || !apiForm.url} className="w-full">
                  {apiFetching ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{translate("Çekiliyor…")}</> : translate("Çek ve İndeksle")}
                </Button>
                <p className="text-[10px] text-muted-foreground">{translate("Yanıt metin olarak alınır, ilk 200KB indekslenir. Özel/iç ağ adresleri engellenmiştir. Kimlik doğrulama bilgileri yenileme için workspace kapsamında şifrelenmiş olarak saklanır.")}</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {sources.filter((s) => s.kind === 'api').length === 0 ? (
          <Card className="p-6 text-center"><Globe className="h-5 w-5 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">{translate("Henüz API bağlı değil.")}</p></Card>
        ) : (
          <div className="space-y-2">
            {sources.filter((s) => s.kind === 'api').map((s) => (
              <Card key={s.id} className="p-3 flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{translate(s.label)}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{s.config?.method || 'GET'} · {s.config?.url} {s.config?.auth?.type && s.config.auth.type !== 'none' ? `· 🔐 ${s.config.auth.type}` : ''}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{translate(s.status)}</Badge>
                <Button size="sm" variant="ghost" onClick={() => refreshApi(s)} disabled={apiFetching} className="gap-1">
                  <RefreshCw className={`h-3 w-3 ${apiFetching ? 'animate-spin' : ''}`} /> {translate("Yenile")}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-3">{translate("Uploaded Documents")}</h2>
        {docs.length === 0 ? (
          <Card className="p-8 text-center"><Database className="h-6 w-6 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">{translate("No documents yet.")}</p></Card>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <Card key={d.id} className="p-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.title}</div>
                  <div className="text-[10px] text-muted-foreground">{d.confidentiality} · {d.process_status} · {d.mime_type || '—'}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{d.source_kind || 'upload'}</Badge>
                {d.file_path && (
                  <Button size="sm" variant="ghost" onClick={() => reingest(d.id)} className="gap-1">
                    <Sparkles className="h-3 w-3" /> {translate("AI çıkar")}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
