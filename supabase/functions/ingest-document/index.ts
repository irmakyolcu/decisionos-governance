import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await supa.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const { document_id } = await req.json();
    if (!document_id) return json({ error: 'document_id required' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: doc, error } = await admin.from('uploaded_documents').select('*').eq('id', document_id).single();
    if (error || !doc) return json({ error: 'not found' }, 404);

    // Membership check
    const { data: memberOk } = await admin.rpc('is_workspace_member', { _user_id: claims.claims.sub, _workspace_id: doc.workspace_id });
    if (!memberOk) return json({ error: 'forbidden' }, 403);

    // If we already have text, skip
    if (doc.content_text && doc.content_text.length > 50) {
      return json({ ok: true, skipped: true, length: doc.content_text.length });
    }

    if (!doc.file_path) return json({ error: 'no file to ingest' }, 400);

    // Download file
    const { data: blob, error: dErr } = await admin.storage.from('company-docs').download(doc.file_path);
    if (dErr || !blob) return json({ error: dErr?.message ?? 'download failed' }, 400);

    const mime = doc.mime_type || blob.type || 'application/octet-stream';
    let extracted = '';

    if (mime.startsWith('text/') || mime === 'text/csv' || mime.includes('json')) {
      extracted = await blob.text();
    } else if (mime === 'application/pdf' || mime.startsWith('image/')) {
      // Use Gemini multimodal to extract text
      const b64 = await blobToB64(blob);
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) return json({ error: 'AI unavailable' }, 500);
      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Extract ALL readable text from this document. Return plain text only, preserving structure with line breaks. No commentary.' },
              mime === 'application/pdf'
                ? { type: 'file', file: { filename: doc.title || 'doc.pdf', file_data: `data:${mime};base64,${b64}` } }
                : { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
            ],
          }],
        }),
      });
      if (!aiRes.ok) {
        const errText = await aiRes.text();
        return json({ error: 'AI extract failed', details: errText, status: aiRes.status }, aiRes.status);
      }
      const ai = await aiRes.json();
      extracted = ai.choices?.[0]?.message?.content ?? '';
    } else {
      // Fallback: try text decode
      try { extracted = await blob.text(); } catch { extracted = ''; }
    }

    extracted = (extracted || '').slice(0, 50000);

    await admin.from('uploaded_documents').update({
      content_text: extracted,
      process_status: 'indexed',
    }).eq('id', document_id);

    if (extracted.length > 50) {
      await admin.from('knowledge_items').insert({
        workspace_id: doc.workspace_id,
        created_by: doc.created_by,
        document_id: doc.id,
        title: doc.title,
        content: extracted.slice(0, 10000),
        summary: extracted.slice(0, 500),
        confidentiality: doc.confidentiality || 'internal',
        source_date: new Date().toISOString(),
      });
    }

    return json({ ok: true, length: extracted.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function blobToB64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)) as never);
  }
  return btoa(bin);
}
