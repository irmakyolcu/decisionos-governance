import { describe, expect, it } from 'vitest';
import { reorderIds, workflowProgress } from '@/lib/workflow';
import { canWriteMemory } from '@/lib/records';
describe('Connected workflow rules',()=>{
 it('derives progress from actual completed steps and tasks',()=>{expect(workflowProgress([{status:'completed'},{status:'pending'}],[{status:'pending'},{status:'completed'}])).toBe(50);});
 it('does not report completion for a project without work',()=>{expect(workflowProgress([],[])).toBeNull();});
 it('preserves step identities on reorder',()=>{expect(reorderIds(['quality','production','shipping'],'shipping','quality')).toEqual(['shipping','quality','production']);});
 it('keeps viewer read only',()=>{expect(canWriteMemory('viewer')).toBe(false);});
 it('keeps auditor read only',()=>{expect(canWriteMemory('auditor')).toBe(false);});
});