import { uploadDocument } from '@/lib/documentUpload';
import { RecordLinks } from '@/components/RecordLinks';
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
import { Plus, FolderKanban, Upload, FileText, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ACCEPTS = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.webp';

export default function ProjectsPage() {
  useLanguage();
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [docsByProject, setDocsByProject] = useState<Record<string, any[]>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', status: 'active', client_id: '', objective: '' });
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from('projects').select('*, clients(name)').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
    setRows(data ?? []);
    const { data: cd } = await supabase.from('clients').select('id,name').eq('workspace_id', workspace.id);
    setClients(cd ?? []);
    const { data: docs } = await supabase.from('uploaded_documents').select('id,title,mime_type,process_status,related_project_id,created_at').eq('workspace_id', workspace.id).not('related_project_id', 'is', null).order('created_at', { ascending: false });
    const grouped: Record<string, any[]> = {};
    (docs ?? []).forEach((d: any) => { (grouped[d.related_project_id] ||= []).push(d); });
    setDocsByProject(grouped);
  };
  useEffect(() => { load(); }, [workspace]);

  const create = async () => {
    if (!workspace || !user || !form.name) return;
    const { error } = await supabase.from('projects').insert({
      workspace_id: workspace.id, created_by: user.id,
      name: form.name, status: form.status,
      client_id: form.client_id || null, objective: form.objective,
    });
    if (error) return toast({ title: translate("Error"), description: error.message, variant: 'destructive' });
    setOpen(false); setForm({ name: '', status: 'active', client_id: '', objective: '' }); load();
  };

  const uploadFile = async () => {
    if (!workspace || !user || !uploadFor || !file) return;
    setUploading(true);
    try {
      const result=await uploadDocument(workspace.id,user.id,file,file.name,'internal',uploadFor);
      if(result.extractionError)toast({title:translate('Error'),description:result.extractionError,variant:'destructive'});else toast({title:translate('Yüklendi')});
      setUploadFor(null); setFile(null); load();
    } catch (e: any) {
      toast({ title: translate("Hata"), description: e.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const reingest = async (id: string) => {
    toast({ title: translate("AI çıkarımı başladı") });
    const { error } = await supabase.functions.invoke('ingest-document', { body: { document_id: id } });
    if (error) toast({ title: translate("Hata"), description: error.message, variant: 'destructive' });
    else { toast({ title: translate("Bitti") }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{translate("Projects")}</h1><p className="text-sm text-muted-foreground">{translate("Project intelligence, next actions and attached documents.")}</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{translate("New Project")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{translate("New Project")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{translate("Name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>{translate("Status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{translate("Active")}</SelectItem><SelectItem value="on_hold">{translate("On hold")}</SelectItem>
                    <SelectItem value="completed">{translate("Completed")}</SelectItem><SelectItem value="cancelled">{translate("Cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{translate("Client (optional)")}</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder={translate("None")} /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{translate("Objective")}</Label><Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} /></div>
              <Button onClick={create} className="w-full">{translate("Create")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <Card className="p-12 text-center"><FolderKanban className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">{translate("No projects yet.")}</p></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((p) => {
            const docs = docsByProject[p.id] || [];
            return (
              <Card id={`record-${p.id}`} key={p.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="font-semibold">{p.name}</div>
                  <Badge variant="outline" className="text-[10px]">{translate(p.status)}</Badge>
                </div>
                {p.clients?.name && <div className="text-xs text-muted-foreground">{translate("Client:")} {p.clients.name}</div>}
                {p.objective && <p className="text-xs text-muted-foreground line-clamp-3">{p.objective}</p>}

                <div className="pt-2 border-t border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-medium text-muted-foreground">{translate("Dosyalar (")}{docs.length})</div>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => { setUploadFor(p.id); setFile(null); }}>
                      <Upload className="h-3 w-3" /> {translate("Ekle")}
                    </Button>
                  </div>
                  {docs.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-auto">
                      {docs.slice(0, 5).map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-xs">
                          <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate" title={d.title}>{d.title}</span>
                          <Badge variant="secondary" className="text-[9px] h-4">{d.process_status}</Badge>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => reingest(d.id)} title={translate("AI ile içerik çıkar")}>
                            <Sparkles className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              <RecordLinks kind="project" id={p.id}/>
</Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!uploadFor} onOpenChange={(o) => { if (!o) { setUploadFor(null); setFile(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{translate("Projeye dosya ekle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{translate("PDF, Word, Excel, CSV, resim vb.")}</Label>
              <Input type="file" accept={ACCEPTS} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <p className="text-[10px] text-muted-foreground mt-1">{translate("km.processingNotice")}</p>
            </div>
            <Button onClick={uploadFile} disabled={!file || uploading} className="w-full">
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{translate("Yükleniyor")}</> : translate("Yükle & İndeksle")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
