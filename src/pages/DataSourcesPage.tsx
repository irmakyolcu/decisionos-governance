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
import { Upload, Database, FileText, Loader2, Sparkles } from 'lucide-react';
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
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [sources, setSources] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', content_text: '', confidentiality: 'internal', mime_type: 'text/plain' });
  const [file, setFile] = useState<File | null>(null);

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
      toast({ title: 'Yüklendi', description: contentText ? 'Doküman indekslendi.' : 'Doküman yüklendi; AI ile içerik çıkarılıyor…' });
      setUploadOpen(false); setFile(null); setForm({ title: '', content_text: '', confidentiality: 'internal', mime_type: 'text/plain' });
      load();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const reingest = async (id: string) => {
    toast({ title: 'AI çıkarımı başladı', description: 'Bir kaç saniye sürebilir.' });
    const { error } = await supabase.functions.invoke('ingest-document', { body: { document_id: id } });
    if (error) toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Bitti', description: 'İçerik güncellendi.' }); load(); }
  };

  const addConnector = async (kind: string, label: string) => {
    if (!workspace || !user) return;
    const { error } = await supabase.from('data_sources').insert({
      workspace_id: workspace.id, created_by: user.id, kind: kind as any, label, status: 'coming_soon',
    });
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Data Sources</h1><p className="text-sm text-muted-foreground">Connect systems and upload knowledge.</p></div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild><Button><Upload className="h-4 w-4 mr-2" />Upload</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Knowledge</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>File (PDF/DOCX/TXT/CSV)</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              <div><Label>Or paste content</Label><Textarea rows={5} value={form.content_text} onChange={(e) => setForm({ ...form, content_text: e.target.value })} /></div>
              <div><Label>Confidentiality</Label>
                <Select value={form.confidentiality} onValueChange={(v) => setForm({ ...form, confidentiality: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public_internal">Public internal</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                    <SelectItem value="highly_confidential">Highly confidential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={upload} className="w-full" disabled={uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : 'Upload & Index'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Connectors</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {CONNECTORS.map((c) => {
            const existing = sources.find((s) => s.kind === c.kind);
            return (
              <Card key={c.kind} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-[10px] text-muted-foreground">{existing ? existing.status : 'Not connected'}</div>
                </div>
                {existing ? <Badge variant="secondary" className="text-[10px]">Soon</Badge>
                  : <Button size="sm" variant="outline" onClick={() => addConnector(c.kind, c.label)}>Add</Button>}
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Uploaded Documents</h2>
        {docs.length === 0 ? (
          <Card className="p-8 text-center"><Database className="h-6 w-6 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No documents yet.</p></Card>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <Card key={d.id} className="p-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.title}</div>
                  <div className="text-[10px] text-muted-foreground">{d.confidentiality} · {d.process_status}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{d.source_kind}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
