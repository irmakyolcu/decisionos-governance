import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import mammoth from 'npm:mammoth@1.13.0';
import readXlsxFile from 'npm:read-excel-file@9.3.13/node';
import { Buffer } from 'node:buffer';
import { z } from 'npm:zod@3';
import { aiChat } from '../_shared/aiClient.ts';
import { validateDocument, validateSignature } from '../_shared/documentRules.ts';
const bodySchema=z.object({document_id:z.string().uuid(),allow_external_ai:z.boolean().default(false)});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_ANON_KEY');if(!url||!key)return json({error:'Service unavailable'},500);
 const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return json({error:'Unauthorized'},401);
 const client=createClient(url,key,{global:{headers:{Authorization:auth}}});
 const {data:user,error:authError}=await client.auth.getUser();if(authError||!user.user)return json({error:'Unauthorized'},401);
 let doc:any;
 try {
 const parsed=bodySchema.safeParse(await req.json());if(!parsed.success)return json({error:'Invalid document request'},400);
 const {document_id,allow_external_ai}=parsed.data;
 const {data,error}=await client.from('uploaded_documents').select('*').eq('id',document_id).single();if(error||!data)return json({error:'Not found'},404);doc=data;
 const {data:member}=await client.from('workspace_members').select('role').eq('workspace_id',doc.workspace_id).eq('user_id',user.user.id).single();if(!['admin','approver'].includes(member?.role??''))return json({error:'Forbidden'},403);
 const {data:claimed,error:claimError}=await client.from('uploaded_documents').update({process_status:'processing',extraction_started_at:new Date().toISOString(),extraction_finished_at:null,extraction_error:null,extraction_attempts:doc.extraction_attempts+1}).eq('id',doc.id).neq('process_status','processing').select('id');
 if(claimError)throw claimError;if(!claimed?.length)return json({error:'Document is already processing'},409);
 let text=doc.content_text??'';
 if(doc.file_path){
 const {data:blob,error:downloadError}=await client.storage.from('company-docs').download(doc.file_path);if(downloadError||!blob)throw new Error('Download failed');
 const metadata=doc.metadata??{};const name=metadata.original_name||doc.file_path.split('/').pop()||doc.title;
 const ext=validateDocument(name,blob.size);const bytes=new Uint8Array(await blob.arrayBuffer());validateSignature(ext,bytes);
 if(!text){
 if(['txt','md','csv','json','xml','log','html','htm'].includes(ext))text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 else if(ext==='docx')text=(await mammoth.extractRawText({buffer:Buffer.from(bytes)})).value;
 else if(ext==='xlsx'){const sheets=await readXlsxFile(Buffer.from(bytes));text=sheets.map((sheet:any)=>sheet.data.map((r:any[])=>r.map(v=>v??'').join('\t')).join('\n')).join('\n\n');}
 else if(ext==='pdf'||['png','jpg','jpeg','webp','gif'].includes(ext)){
 if(!allow_external_ai){await client.from('uploaded_documents').update({process_status:'needs_review',extraction_error:'External AI extraction consent required',extraction_finished_at:new Date().toISOString()}).eq('id',doc.id);return json({ok:true,needs_consent:true});}
 let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.slice(i,i+32768));
 const mime=ext==='pdf'?'application/pdf':doc.mime_type;
 text=await aiChat({messages:[{role:'user',content:[{type:'text',text:'Extract readable text only. Preserve structure. Do not invent missing text.'},ext==='pdf'?{type:'file',file:{filename:name,file_data:`data:${mime};base64,${btoa(binary)}`}}:{type:'image_url',image_url:{url:`data:${mime};base64,${btoa(binary)}`}}]}]});
 }else{await client.from('uploaded_documents').update({process_status:'needs_review',extraction_error:'Unsupported content extraction; original preserved',extraction_finished_at:new Date().toISOString()}).eq('id',doc.id);return json({ok:true,unsupported:true});}
 }
 }
 if(!text.trim())throw new Error('No readable content found');
 const {data:existing,error:findError}=await client.from('knowledge_items').select('id').eq('document_id',doc.id).order('created_at').limit(1);if(findError)throw findError;
 const payload={workspace_id:doc.workspace_id,created_by:doc.created_by,document_id:doc.id,title:doc.title,content:text.slice(0,200000),summary:text.slice(0,500),confidentiality:doc.confidentiality,source_date:doc.created_at};
 const {error:indexError}=existing?.[0]?await client.from('knowledge_items').update(payload).eq('id',existing[0].id):await client.from('knowledge_items').insert(payload);if(indexError)throw indexError;
 const {error:finishError}=await client.from('uploaded_documents').update({content_text:text.slice(0,200000),process_status:'indexed',extraction_error:null,extraction_finished_at:new Date().toISOString()}).eq('id',doc.id);if(finishError)throw finishError;
 return json({ok:true,length:text.length});
 }catch(error){if(doc)await client.from('uploaded_documents').update({process_status:'failed',extraction_error:error instanceof Error?error.message:'Extraction failed',extraction_finished_at:new Date().toISOString()}).eq('id',doc.id);return json({error:error instanceof Error?error.message:'Extraction failed'},400);}
});
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});}
