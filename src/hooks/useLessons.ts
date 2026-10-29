import { useEffect, useState, useCallback, useRef } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { lessonPayload } from '@/lib/records';
export type Lesson = { id: string; title: string; context: string; what_worked: string; what_failed: string; recommendation: string; category: string; impact: 'positive' | 'negative' | 'mixed'; source: string; observed_outcome?: string; created_at: string; decisionIds?: string[] };
export type LinkChangeSource = 'manual' | 'suggestion' | 'auto_link_all';
export function lessonsKey(wsId?: string) { return wsId ? `mem:lessons:${wsId}` : 'mem:lessons'; }
export function useLessons() {
 const { workspace } = useWorkspace(); const [rows, setRows] = useState<Lesson[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 const request=useRef(0);
 const reload=useCallback(async()=>{
 const version=++request.current;
  if(!workspace){setRows([]);setLoading(false);return;} setLoading(true);setError(null);
  const [items,links]=await Promise.all([supabase.from('knowledge_items').select('*').eq('workspace_id',workspace.id).eq('entity_type','lesson').order('created_at',{ascending:false}),supabase.from('record_links').select('*').eq('workspace_id',workspace.id)]);
  if(version!==request.current)return;
  if(items.error||links.error){setError(items.error?.message??links.error?.message??'Error');setRows([]);} else setRows((items.data??[]).map(r=>{const d=r.lesson_data as Partial<Lesson>;return {context:r.content??'',recommendation:r.summary??'',what_worked:'',what_failed:'',category:'Strategy',impact:'mixed' as const,source:'',...d,id:r.id,title:r.title,created_at:r.created_at,decisionIds:(links.data??[]).flatMap(l=>l.source_kind==='lesson'&&l.source_id===r.id&&l.target_kind==='decision'?[l.target_id]:l.target_kind==='lesson'&&l.target_id===r.id&&l.source_kind==='decision'?[l.source_id]:[])};}));setLoading(false);
 },[workspace?.id]);
 useEffect(()=>{setRows([]);reload();return()=>{request.current++;};},[reload]);
 async function save(lesson: Partial<Lesson>){if(!workspace)throw new Error('No workspace');const payload={...lessonPayload(lesson),workspace_id:workspace.id};const {error}=lesson.id?await supabase.from('knowledge_items').update(payload).eq('id',lesson.id):await supabase.from('knowledge_items').insert({...payload,created_by:(await supabase.auth.getUser()).data.user?.id??''});if(error)throw error;await reload();}
 async function remove(id:string){const {error}=await supabase.from('knowledge_items').delete().eq('id',id);if(error)throw error;await reload();}
 async function persist(next:Lesson[]){for(const l of next)await save(l);}
 async function setLinks(lessonId:string,ids:string[],_source:LinkChangeSource='manual'){
 if(!workspace)return;const {data,error}=await supabase.from('record_links').select('*').eq('workspace_id',workspace.id);if(error)throw error;
 const old=(data??[]).filter(l=>(l.source_kind==='lesson'&&l.source_id===lessonId&&l.target_kind==='decision')||(l.target_kind==='lesson'&&l.target_id===lessonId&&l.source_kind==='decision'));
 for(const l of old){const did=l.source_kind==='decision'?l.source_id:l.target_id;if(!ids.includes(did)){const {error}=await supabase.from('record_links').delete().eq('id',l.id);if(error)throw error;}}
 for(const did of ids){if(old.some(l=>l.source_id===did||l.target_id===did))continue;const {error}=await supabase.from('record_links').insert({workspace_id:workspace.id,source_kind:'lesson',source_id:lessonId,target_kind:'decision',target_id:did});if(error)throw error;}
 await reload();
 }
 return {rows,loading,error,save,remove,persist,reload,setLinks,toggleLink:(lid:string,did:string)=>{const ids=rows.find(l=>l.id===lid)?.decisionIds??[];return setLinks(lid,ids.includes(did)?ids.filter(i=>i!==did):[...ids,did]);}};
}

// Simple keyword-overlap scoring
const STOP = new Set(['the','a','an','and','or','of','to','in','for','on','with','is','are','was','were','be','by','it','this','that','from','at','as','we','our','you','not','no','yes','but','if','so','then','than','over','under','into','out','about','after','before','when','while','more','less','can','will','would','should','could','may','might','use','used','using','via','per','&']);

export function tokenize(s: string): string[] {
  return (s || '').toLowerCase().replace(/[^a-z0-9çğıöşü\s-]/gi, ' ').split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export function scoreMatch(lessonText: string, decisionText: string): number {
  const a = new Set(tokenize(lessonText));
  const b = new Set(tokenize(decisionText));
  let overlap = 0;
  a.forEach((t) => { if (b.has(t)) overlap += 1; });
  return overlap;
}
