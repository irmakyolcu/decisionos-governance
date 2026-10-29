export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_EXTENSIONS = ['pdf','doc','docx','xls','xlsx','csv','txt','md','json','xml','log','rtf','html','htm','png','jpg','jpeg','webp','gif','tiff','mp3','wav','m4a','ogg','ppt','pptx'];
export function validateDocument(name: string, size: number) {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (!DOCUMENT_EXTENSIONS.includes(extension)) throw new Error('Unsupported file type');
  if (size <= 0 || size > DOCUMENT_MAX_BYTES) throw new Error('File must be between 1 byte and 20MB');
  return extension;
}
export function validateSignature(extension: string, bytes: Uint8Array) {
  if (extension === 'pdf' && String.fromCharCode(...bytes.slice(0,5)) !== '%PDF-') throw new Error('Invalid PDF signature');
  if (['docx','xlsx','pptx'].includes(extension) && (bytes[0] !== 0x50 || bytes[1] !== 0x4b)) throw new Error('Invalid Office signature');
  if (['txt','md','csv','json','xml','log','html','htm'].includes(extension) && bytes.slice(0,4096).includes(0)) throw new Error('Binary content is not a text document');
}