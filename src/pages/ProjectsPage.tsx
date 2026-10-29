import { uploadDocument } from '@/lib/documentUpload';
import { RecordLinks } from '@/components/RecordLinks';
import { Link } from 'react-router-dom';
import { useWorkflow } from '@/hooks/useWorkflow';
import { workflowProgress } from '@/lib/workflow';
import { canWriteMemory } from '@/lib/records';
import { MemberSelect, type WorkflowMember } from '@/components/WorkflowExecution';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { workspace, role } = useWorkspace();
  const wf = useWorkflow(); const writer = canWriteMemory(role);
  const [members,setMembers]=useState<WorkflowMember[]>([]); const [processes,setProcesses]=useState<any[]>([]);
  const [editingId,setEditingId]=useState<string|null>(null);const [attachFor,setAttachFor]=useState<string|null>(null);
  const [attach,setAttach]=useState({process_id:'',phase_id:'',sequential:true});
  const emptyForm={name:'',status:'active',client_id:'',objective:'',owner_id:'',start_date:'',end_date:'',participants:[] as string[],phases:[] as {id?:string;name:string;position:number}[]};
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [docsByProject, setDocsByProject] = useState<Record<string, any[]>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from('projects').select('*, clients(name)').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
    setRows(data ?? []);
    const { data: cd } = await supabase.from('clients').select('id,name').eq('workspace_id', workspace.id);
    setClients(cd ?? []);
    const [pr,mr]=await Promise.all([supabase.from('processes').select('*').eq('workspace_id',workspace.id),supabase.from('workspace_members').select('user_id,role').eq('workspace_id',workspace.id)]);
    const userIds=(mr.data??[]).map(m=>m.user_id);const profiles=userIds.length?await supabase.from('profiles').select('user_id,display_name').in('user_id',userIds):{data:[],error:null};
    setProcesses(pr.data??[]);setMembers((mr.data??[]).map(m=>({...m,display_name:profiles.data?.find(p=>p.user_id===m.user_id)?.display_name??null})));
    const { data: docs } = await supabase.from('uploaded_documents').select('id,title,mime_type,process_status,related_project_id,created_at').eq('workspace_id', workspace.id).not('related_project_id', 'is', null).order('created_at', { ascending: false });
    const grouped: Record<string, any[]> = {};
    (docs ?? []).forEach((d: any) => { (grouped[d.related_project_id] ||= []).push(d); });
    setDocsByProject(grouped);
  };
  useEffect(() => { load(); }, [workspace]);

  const create = async () => {
    if (!workspace || !user || !form.name) return;
    const payload={name:form.name,status:form.status,client_id:form.client_id||null,objective:form.objective,owner_id:form.owner_id||null,start_date:form.start_date||null,end_date:form.end_date||null};
    const result=editingId?await supabase.from('projects').update(payload).eq('id',editingId).select('id').single():await supabase.from('projects').insert({...payload,workspace_id:workspace.id,created_by:user.id}).select('id').single();
    if(result.error)return toast({title:translate('Error'),description:result.error.message,variant:'destructive'});
    const config=await supabase.rpc('workflow_project_config',{_project:result.data.id,_phases:form.phases,_participants:form.participants});
    if(config.error){setEditingId(result.data.id);return toast({title:translate('Error'),description:config.error.message,variant:'destructive'});}
    setOpen(false);setEditingId(null);setForm(emptyForm);load();wf.refetch();
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
          {writer&&<Button onClick={()=>{setEditingId(null);setForm(emptyForm);setOpen(true);}}><Plus className="h-4 w-4 mr-2" />{translate("New Project")}</Button>}
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{translate(editingId?'wf.edit':"New Project")}</DialogTitle></DialogHeader>
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
              <div><Label>{translate('Owner')}</Label><MemberSelect label={translate('Owner')} members={members} value={form.owner_id} onChange={v=>setForm({...form,owner_id:v})}/></div>
              <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="project-start">{translate('wf.startDate')}</Label><Input id="project-start" type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></div><div><Label htmlFor="project-end">{translate('wf.endDate')}</Label><Input id="project-end" type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/></div></div>
              <Label>{translate('wf.participants')}</Label>{members.map(m=><label className="flex gap-2 text-sm" key={m.user_id}><Checkbox checked={form.participants.includes(m.user_id)} onCheckedChange={v=>setForm({...form,participants:v?[...form.participants,m.user_id]:form.participants.filter(id=>id!==m.user_id)})}/>{m.display_name||m.user_id.slice(0,8)}</label>)}
              <Label>{translate('wf.phases')}</Label>{form.phases.map((phase,i)=><Input aria-label={`${translate('wf.phase')} ${i+1}`} key={phase.id??i} value={phase.name} onChange={e=>setForm({...form,phases:form.phases.map((p,index)=>index===i?{...p,name:e.target.value}:p)})}/>)}<Button variant="outline" size="sm" onClick={()=>setForm({...form,phases:[...form.phases,{name:'',position:form.phases.length}]})}><Plus className="h-3 w-3 mr-1"/>{translate('wf.phase')}</Button>
              <Button onClick={create} disabled={!form.name.trim()} className="w-full">{translate(editingId?'Save':"Create")}</Button>
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
                <p className="text-xs text-muted-foreground">{translate('Owner')}: {members.find(m=>m.user_id===p.owner_id)?.display_name||translate('Unassigned')}</p>
                <p className="text-sm">{translate('wf.progress')}: {workflowProgress(wf.data?.steps.filter(s=>wf.data?.runs.some(r=>r.project_id===p.id&&r.id===s.run_id))??[],wf.data?.tasks.filter(s=>wf.data?.runs.some(r=>r.project_id===p.id&&r.id===s.run_id))??[])??translate('wf.noWork')}{wf.data?.runs.some(r=>r.project_id===p.id)?'%':''}</p>
                <div className="space-y-1">{wf.data?.runs.filter(r=>r.project_id===p.id).map(r=><Link className="block text-sm text-primary underline" key={r.id} to={`/processes?run=${r.id}`}>{r.name}{r.phase_id&&` · ${wf.data.phases.find(ph=>ph.id===r.phase_id)?.name??''}`}</Link>)}</div>
                {writer&&<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>{setEditingId(p.id);setForm({...emptyForm,...p,owner_id:p.owner_id??'',client_id:p.client_id??'',start_date:p.start_date??'',end_date:p.end_date??'',participants:wf.data?.participants.filter(m=>m.project_id===p.id).map(m=>m.user_id)??[],phases:wf.data?.phases.filter(ph=>ph.project_id===p.id)??[]});setOpen(true);}}>{translate('wf.edit')}</Button><Button size="sm" variant="outline" onClick={()=>{setAttachFor(p.id);setAttach({process_id:'',phase_id:'',sequential:true});}}><Plus className="h-3 w-3 mr-1"/>{translate('wf.attach')}</Button></div>}

                <div className="pt-2 border-t border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-medium text-muted-foreground">{translate("Dosyalar (")}{docs.length})</div>
                    <Button disabled={!writer} size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => { setUploadFor(p.id); setFile(null); }}>
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
                          <Button disabled={!writer} size="icon" variant="ghost" className="h-5 w-5" onClick={() => reingest(d.id)} title={translate("AI ile içerik çıkar")}>
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

      <Dialog open={!!attachFor} onOpenChange={v=>{if(!v)setAttachFor(null);}}><DialogContent><DialogHeader><DialogTitle>{translate('wf.attach')}</DialogTitle></DialogHeader><Label>{translate('Processes')}</Label><Select value={attach.process_id} onValueChange={v=>setAttach({...attach,process_id:v})}><SelectTrigger aria-label={translate('Processes')}><SelectValue/></SelectTrigger><SelectContent>{processes.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><Label>{translate('wf.phase')}</Label><Select value={attach.phase_id||'none'} onValueChange={v=>setAttach({...attach,phase_id:v==='none'?'':v})}><SelectTrigger aria-label={translate('wf.phase')}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">{translate('wf.none')}</SelectItem>{wf.data?.phases.filter(ph=>ph.project_id===attachFor).map(ph=><SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>)}</SelectContent></Select><label className="flex gap-2 text-sm"><Checkbox checked={attach.sequential} onCheckedChange={v=>setAttach({...attach,sequential:v===true})}/>{translate('wf.sequential')}</label><Button disabled={!attach.process_id||wf.busy} onClick={async()=>{try{await wf.command('create_run',null,null,{project_id:attachFor,process_id:attach.process_id,phase_id:attach.phase_id||null,sequential:attach.sequential});setAttachFor(null);}catch(e:any){toast({title:translate('Error'),description:e.message,variant:'destructive'});}}}>{translate('wf.start')}</Button></DialogContent></Dialog>
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
