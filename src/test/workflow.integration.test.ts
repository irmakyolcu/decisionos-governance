import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { supabase } from '@/integrations/supabase/client';
// Explicit opt-in: creates TEST workflow runs, never changes existing users or their roles.
const enabled = process.env.WORKFLOW_INTEGRATION === 'true';
describe.skipIf(!enabled)('Persistent workflow completion gates', () => {
 let run = ''; let first = ''; let second = ''; let userId = ''; let task = '';
 const apply = (op: string, step: string, payload: any = {}) => supabase.rpc('workflow_apply', { _operation: op, _run: run, _step: step, _payload: payload, _request: crypto.randomUUID() });
 beforeAll(async () => {
  const minted = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, 'utf8'));
  await supabase.auth.setSession(minted.session); userId = minted.session.user.id;
  const project = await supabase.from('projects').select('id').eq('name', 'TEST Workflow October 29').single();
  const process = await supabase.from('processes').select('id').eq('name', 'TEST Quality and production').single();
  if (!project.data || !process.data) throw new Error('Create the dedicated TEST project and process first');
  const result = await supabase.rpc('workflow_apply', { _operation: 'create_run', _payload: { project_id: project.data.id, process_id: process.data.id, sequential: true } });
  if (result.error) throw result.error;
  run = (result.data as { run_id: string }).run_id;
  const steps = await supabase.from('workflow_steps').select('id').eq('run_id',run).order('position');
  first = steps.data?.[0]?.id ?? ''; second = steps.data?.[1]?.id ?? '';
  if (!first || !second) throw new Error('TEST steps missing');
 }, 30000);
 it('rejects completion while predecessor is incomplete', async () => { expect((await apply('step_status',second,{status:'completed'})).error?.message).toContain('wf.block.dependencies'); });
 it('rejects completion with an incomplete required task', async () => {
  const result = await apply('add_task',first,{title:'TEST required task',assignee_id:userId,required:true});expect(result.error).toBeNull();task=(result.data as {id:string}).id;
  expect((await apply('step_status',first,{status:'completed'})).error?.message).toContain('wf.block.tasks');
 });
 it('requires current authorized approval',async()=>{
  expect((await apply('task_status',first,{task_id:task,status:'completed'})).error).toBeNull();
  expect((await apply('edit_step',first,{title:'TEST approval gate',owner_id:userId,quality_owner_id:userId,required_approvals:1,assigned_users:[],approver_ids:[userId]})).error).toBeNull();
  expect((await apply('step_status',first,{status:'completed'})).error?.message).toContain('wf.block.approvals');
  await apply('request_approval',first);expect((await apply('vote',first,{vote:'approve'})).error).toBeNull();expect((await apply('step_status',first,{status:'completed'})).error).toBeNull();
 });
 it('creates only one corrective task for repeated quality failure',async()=>{
  expect((await apply('quality_fail',first)).error).toBeNull();expect((await apply('quality_fail',first)).error).toBeNull();
  const corrections=await supabase.from('workflow_tasks').select('id').eq('step_id',first).eq('corrective',true);expect(corrections.data).toHaveLength(1);
  expect((await apply('step_status',second,{status:'completed'})).error?.message).toContain('wf.block.dependencies');
 });
 it('rejects circular prerequisites',async()=>{expect((await apply('dependencies',first,{ids:[second]})).error?.message).toContain('wf.cycle');});
 it('prevents bypass through direct writes',async()=>{
  const result=await supabase.from('workflow_steps').update({status:'completed'}).eq('id',first).select();
  expect(!!result.error || result.data?.length===0).toBe(true);
  const current=await supabase.from('workflow_steps').select('status').eq('id',first).single();expect(current.data?.status).toBe('pending');
 });
 it('deduplicates replayed commands and assignment notifications',async()=>{
  const request=crypto.randomUUID();const args={_operation:'add_task',_run:run,_step:second,_payload:{title:'TEST replay task',assignee_id:userId},_request:request};
  expect((await supabase.rpc('workflow_apply',args)).error).toBeNull();expect((await supabase.rpc('workflow_apply',args)).error).toBeNull();
  const deliveries=await supabase.from('workflow_deliveries').select('id').eq('event_key',request);expect(deliveries.data).toHaveLength(1);
 });
});