import { describe, it, expect } from 'vitest';
import { canWriteMemory, lessonPayload, recordHref } from '@/lib/records';
import { validateDocument, validateSignature, DOCUMENT_MAX_BYTES } from '../../supabase/functions/_shared/documentRules';
describe('knowledge permissions and provenance',()=>{
 it('allows admins to write',()=>expect(canWriteMemory('admin')).toBe(true));
 it('allows approvers to write',()=>expect(canWriteMemory('approver')).toBe(true));
 it('keeps viewers read only',()=>expect(canWriteMemory('viewer')).toBe(false));
 it('keeps auditors read only',()=>expect(canWriteMemory('auditor')).toBe(false));
 it('preserves manually entered lesson source, recommendation and observed outcome',()=>expect(lessonPayload({title:'Pricing review',source:'Meeting 42',recommendation:'Review discounts',observed_outcome:'Customer renewed'}).lesson_data).toMatchObject({source:'Meeting 42',recommendation:'Review discounts',observed_outcome:'Customer renewed'}));
 it('never imports demo decision links into the canonical lesson',()=>expect(lessonPayload({title:'Lesson',decisionIds:['demo-1']})).not.toHaveProperty('decisionIds'));
 it('opens canonical decisions',()=>expect(recordHref('decision','123')).toBe('/decisions/list/123'));
 it.each(['pdf','docx','txt','csv','xlsx'])('accepts requested %s documents',ext=>expect(validateDocument(`file.${ext}`,100)).toBe(ext));
 it('rejects unsupported executables',()=>expect(()=>validateDocument('malware.exe',100)).toThrow());
 it('rejects files above the configured 20MB cap',()=>expect(()=>validateDocument('file.txt',DOCUMENT_MAX_BYTES+1)).toThrow());
 it('rejects a forged PDF',()=>expect(()=>validateSignature('pdf',new TextEncoder().encode('not PDF'))).toThrow());
 it('rejects binary text documents',()=>expect(()=>validateSignature('txt',new Uint8Array([0,2]))).toThrow());
});