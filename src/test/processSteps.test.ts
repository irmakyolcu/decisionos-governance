import { describe, expect, it } from 'vitest';
import { normalizeProcessSteps } from '../../supabase/functions/_shared/processSteps';
describe('Imported process step identity',()=>{
 it('preserves valid supplied identities',()=>{const id='8097d28d-9d99-4e2f-96a3-e90e3b794ad5';expect(normalizeProcessSteps([{id,title:'Review'}])[0].id).toBe(id);});
 it('creates persistent identities for legacy text steps',()=>{expect(normalizeProcessSteps(['Review'])[0].id).toMatch(/^[0-9a-f-]{36}$/);});
 it('rejects duplicate identities rather than breaking links',()=>{const row={id:'8097d28d-9d99-4e2f-96a3-e90e3b794ad5',title:'Review'};expect(()=>normalizeProcessSteps([row,row])).toThrow('Duplicate step identity');});
 it('rejects invalid supplied identities rather than silently replacing them',()=>{expect(()=>normalizeProcessSteps([{id:'invalid',title:'Review'}])).toThrow('Invalid step identity');});
});