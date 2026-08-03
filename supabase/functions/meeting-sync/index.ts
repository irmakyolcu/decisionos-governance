// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { SUPPORTED_CONNECTORS, callAsAppUser } from '../_shared/appUserConnector.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function summarize(text: string, fallbackTitle: string) {
  const key = Deno.env.get('LOVABLE_API_KEY');
  const empty = { title: fallbackTitle, summary: '', action_items: [] as string[] };
  if (!key || !text.trim()) return empty;

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content:
            'Sen bir kurumsal toplantı sekreterisin. Verilen ham konuşma/notlardan Türkçe bir toplantı kaydı çıkar. Sadece JSON döndür: {"title":string,"summary":string,"action_items":string[],"decisions":string[]}',
        },
        { role: 'user', content: text.slice(0, 20000) },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    console.error('AI summarize failed', res.status, await res.text());
    return empty;
  }
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
    return {
      title: parsed.title || fallbackTitle,
      summary: parsed.summary || '',
      action_items: [
        ...(parsed.action_items ?? []),
        ...(parsed.decisions ?? []).map((d: string) => `Karar: ${d}`),
      ],
    };
  } catch {
    return empty;
  }
}

const hhmm = (d: Date) => d.toISOString().slice(11, 16);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { action = 'list', connector_id, source_id, days = 14 } = await req.json().catch(() => ({}));
    if (!SUPPORTED_CONNECTORS.includes(connector_id)) return json({ error: 'Unsupported connector' }, 400);

    const { data: conn } = await admin
      .from('app_user_connections')
      .select('connection_key, workspace_id')
      .eq('user_id', user.id)
      .eq('connector_id', connector_id)
      .maybeSingle();

    if (!conn?.connection_key) return json({ error: 'not_connected', connector_id }, 409);
    const connectionKey = conn.connection_key;
    const workspaceId = conn.workspace_id;

    const call = async (path: string, init?: RequestInit) => {
      const res = await callAsAppUser({ connectorId: connector_id, connectionKey, path, init });
      const text = await res.text();
      if (!res.ok) throw new Error(`[${res.status}] ${text.slice(0, 500)}`);
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON provider response: ${text.slice(0, 200)}`);
      }
    };

    const since = new Date(Date.now() - Number(days) * 86400000);

    // ---- LIST available sources (channels / calendars / teams) ----
    if (action === 'list') {
      if (connector_id === 'slack') {
        const data = await call('/api/conversations.list?limit=200&types=public_channel,private_channel');
        if (!data.ok) return json({ error: data.error ?? 'slack_error' }, 502);
        return json({
          sources: (data.channels ?? []).map((c: any) => ({ id: c.id, name: `#${c.name}` })),
        });
      }
      if (connector_id === 'google_calendar') {
        const data = await call('/calendar/v3/users/me/calendarList');
        return json({
          sources: (data.items ?? []).map((c: any) => ({ id: c.id, name: c.summary })),
        });
      }
      // microsoft_teams: list team + channel pairs
      const teams = await call('/me/joinedTeams');
      const sources: any[] = [];
      for (const t of (teams.value ?? []).slice(0, 10)) {
        try {
          const ch = await call(`/teams/${t.id}/channels`);
          for (const c of ch.value ?? []) {
            sources.push({ id: `${t.id}|${c.id}`, name: `${t.displayName} / ${c.displayName}` });
          }
        } catch (e) {
          console.error('teams channels failed', e);
        }
      }
      return json({ sources });
    }

    // ---- IMPORT meetings/notes ----
    if (action !== 'import') return json({ error: 'Unknown action' }, 400);
    if (!source_id) return json({ error: 'source_id required' }, 400);

    const imported: any[] = [];

    const upsertMeeting = async (m: {
      title: string; date: Date; start: Date; end: Date; location: string;
      externalRef: string; transcript: string; summary: string; actionItems: string[];
    }) => {
      const { data, error } = await admin
        .from('meetings')
        .upsert(
          {
            workspace_id: workspaceId,
            title: m.title.slice(0, 200),
            date: ymd(m.date),
            start_time: hhmm(m.start),
            end_time: hhmm(m.end),
            location: m.location,
            chairperson_id: user.id,
            source: connector_id,
            external_ref: m.externalRef,
            transcript: m.transcript.slice(0, 100000),
            summary: m.summary,
            action_items: m.actionItems,
            imported_at: new Date().toISOString(),
          },
          { onConflict: 'workspace_id,external_ref' },
        )
        .select('id, title')
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) imported.push(data);
    };

    if (connector_id === 'slack') {
      const oldest = Math.floor(since.getTime() / 1000);
      const hist = await call(`/api/conversations.history?channel=${encodeURIComponent(source_id)}&limit=200&oldest=${oldest}`);
      if (!hist.ok) return json({ error: hist.error ?? 'slack_error' }, 502);

      const users: Record<string, string> = {};
      try {
        const ul = await call('/api/users.list?limit=200');
        for (const u of ul.members ?? []) users[u.id] = u.profile?.display_name || u.real_name || u.name || u.id;
      } catch (_) { /* names optional */ }

      const msgs = (hist.messages ?? []).filter((m: any) => m.text).reverse();
      if (msgs.length === 0) return json({ imported: [], message: 'Bu kanalda seçilen aralıkta mesaj yok.' });

      // Group by calendar day → one meeting record per day
      const byDay: Record<string, any[]> = {};
      for (const m of msgs) {
        const d = new Date(Number(m.ts) * 1000);
        (byDay[ymd(d)] ??= []).push({ d, m });
      }

      for (const [day, entries] of Object.entries(byDay)) {
        const transcript = entries
          .map(({ d, m }: any) =>
            `[${hhmm(d)}] ${users[m.user] ?? m.user ?? 'bot'}: ${String(m.text).replace(/<@([A-Z0-9]+)>/g, (_x, id) => `@${users[id] ?? id}`)}`,
          )
          .join('\n');
        const ai = await summarize(transcript, `Slack notları – ${day}`);
        await upsertMeeting({
          title: ai.title,
          date: entries[0].d,
          start: entries[0].d,
          end: entries[entries.length - 1].d,
          location: 'Slack',
          externalRef: `slack:${source_id}:${day}`,
          transcript,
          summary: ai.summary,
          actionItems: ai.action_items,
        });
      }
    }

    if (connector_id === 'google_calendar') {
      const params = new URLSearchParams({
        timeMin: since.toISOString(),
        timeMax: new Date().toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50',
      });
      const data = await call(`/calendar/v3/calendars/${encodeURIComponent(source_id)}/events?${params}`);
      for (const ev of data.items ?? []) {
        const start = new Date(ev.start?.dateTime ?? `${ev.start?.date}T09:00:00Z`);
        const end = new Date(ev.end?.dateTime ?? `${ev.end?.date}T10:00:00Z`);
        const attendees = (ev.attendees ?? []).map((a: any) => a.email).join(', ');
        const transcript = [
          `Etkinlik: ${ev.summary ?? '(başlıksız)'}`,
          attendees && `Katılımcılar: ${attendees}`,
          ev.location && `Konum: ${ev.location}`,
          ev.description && `Notlar:\n${String(ev.description).replace(/<[^>]+>/g, ' ')}`,
        ].filter(Boolean).join('\n');
        const ai = await summarize(transcript, ev.summary ?? 'Takvim toplantısı');
        await upsertMeeting({
          title: ev.summary ?? ai.title,
          date: start,
          start,
          end,
          location: ev.location ?? ev.hangoutLink ?? 'Google Meet',
          externalRef: `gcal:${ev.id}`,
          transcript,
          summary: ai.summary,
          actionItems: ai.action_items,
        });
      }
    }

    if (connector_id === 'microsoft_teams') {
      const [teamId, channelId] = String(source_id).split('|');
      if (!teamId || !channelId) return json({ error: 'source_id must be teamId|channelId' }, 400);
      const data = await call(`/teams/${teamId}/channels/${channelId}/messages?$top=50`);
      const msgs = (data.value ?? [])
        .filter((m: any) => m.body?.content && new Date(m.createdDateTime) >= since)
        .reverse();
      if (msgs.length === 0) return json({ imported: [], message: 'Bu kanalda seçilen aralıkta mesaj yok.' });

      const byDay: Record<string, any[]> = {};
      for (const m of msgs) (byDay[ymd(new Date(m.createdDateTime))] ??= []).push(m);

      for (const [day, entries] of Object.entries(byDay)) {
        const transcript = entries
          .map((m: any) =>
            `[${hhmm(new Date(m.createdDateTime))}] ${m.from?.user?.displayName ?? 'Bilinmeyen'}: ${String(m.body.content).replace(/<[^>]+>/g, ' ').trim()}`,
          )
          .join('\n');
        const ai = await summarize(transcript, `Teams notları – ${day}`);
        const first = new Date(entries[0].createdDateTime);
        const last = new Date(entries[entries.length - 1].createdDateTime);
        await upsertMeeting({
          title: ai.title,
          date: first,
          start: first,
          end: last,
          location: 'Microsoft Teams',
          externalRef: `teams:${channelId}:${day}`,
          transcript,
          summary: ai.summary,
          actionItems: ai.action_items,
        });
      }
    }

    return json({ imported, count: imported.length });
  } catch (e) {
    console.error('meeting-sync error:', e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
