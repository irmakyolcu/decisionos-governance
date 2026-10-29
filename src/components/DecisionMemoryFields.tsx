import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export type MemoryFields = { decision_date: string; owner_id: string; rationale: string; expected_outcomes: string; options: string };
export const emptyMemoryFields: MemoryFields={decision_date:'',owner_id:'',rationale:'',expected_outcomes:'',options:''};
export function DecisionMemoryFields({ value, onChange, disabled=false }: { value: MemoryFields; onChange: (v: MemoryFields)=>void; disabled?: boolean }) {
 const {t}=useLanguage();const {workspace}=useWorkspace();const [members,setMembers]=useState<{user_id:string;display_name:string|null}[]>([]);
 useEffect(()=>{let active=true;setMembers([]);if(!workspace)return;(async()=>{const {data}=await supabase.from('workspace_members').select('user_id').eq('workspace_id',workspace.id);if(!data?.length)return;const {data:profiles}=await supabase.from('profiles').select('user_id,display_name').in('user_id',data.map(m=>m.user_id));if(active)setMembers(data.map(m=>({user_id:m.user_id,display_name:profiles?.find(p=>p.user_id===m.user_id)?.display_name??null})));})();return()=>{active=false;};},[workspace?.id]);
 return <div className="space-y-3"><div><Label htmlFor="memory-date">{t('km.date')}</Label><Input id="memory-date" type="date" disabled={disabled} value={value.decision_date} onChange={e=>onChange({...value,decision_date:e.target.value})}/></div><div><Label>{t('km.owner')}</Label><Select disabled={disabled} value={value.owner_id||'none'} onValueChange={v=>onChange({...value,owner_id:v==='none'?'':v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">{t('Unassigned')}</SelectItem>{members.map(m=><SelectItem key={m.user_id} value={m.user_id}>{m.display_name??m.user_id}</SelectItem>)}</SelectContent></Select></div>{(['rationale','expected_outcomes','options'] as const).map(k=><div key={k}><Label htmlFor={`memory-${k}`}>{t(k==='rationale'?'km.rationale':k==='options'?'Options considered':'km.expected')}</Label><Textarea id={`memory-${k}`} disabled={disabled} value={value[k]} onChange={e=>onChange({...value,[k]:e.target.value})}/></div>)}</div>;
}