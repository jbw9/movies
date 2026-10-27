// Rotten Tomatoes scores for the site (assets/js/ratings.js), shared by everyone: POST {keys: ["movie:550",
// "tv:2190", "ep:2190:1:1"]} answers {"movie:550": 81, "tv:2190": 80, "ep:2190:1:1": null}, null where
// there's no score. Scores live in rt_scores (supabase/accounts.sql). Movies and series missing or old
// are fetched from MDBList in one request per type, with the key in the MDBLIST_KEY secret; nothing has
// episode scores but Rotten Tomatoes' own episode pages, so those are read from there, at the series'
// Rotten Tomatoes address that MDBList gives. Deployed with verify_jwt off, since the site calls it with
// the publishable key.
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const MDBLIST = Deno.env.get('MDBLIST_KEY');
const DAY = 864e5;
const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};
type Row = { key: string; score: number | null; url?: string | null; fetched_at: string };

// A score is good for a month; no score is asked about again after a week, in case one appeared.
const fresh = (r: Row) => Date.now() - new Date(r.fetched_at).getTime() < (r.score == null ? 7 : 30) * DAY;

async function mdblist(type: string, ids: number[]) {
    const r = await fetch(`https://api.mdblist.com/tmdb/${type === 'tv' ? 'show' : 'movie'}?apikey=${MDBLIST}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });
    if (!r.ok) return null;
    const found = new Map<number, { score: number | null; url: string | null }>();
    for (const item of await r.json()) {
        const rt = (item.ratings || []).find((x: { source: string }) => x.source === 'tomatoes');
        found.set(item.ids?.tmdb, { score: rt?.value ?? null, url: rt?.url ?? null });
    }
    return ids.map(id => ({ key: `${type}:${id}`, ...(found.get(id) || { score: null, url: null }), fetched_at: new Date().toISOString() }));
}

// The episode's Tomatometer, from the page's own score data; undefined when the page couldn't be read.
async function episode(url: string, season: string, ep: string) {
    const pad = (n: string) => n.padStart(2, '0');
    const r = await fetch(`https://www.rottentomatoes.com${url}/s${pad(season)}/e${pad(ep)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    }).catch(() => null);
    if (!r) return undefined;
    if (r.status === 404) return null;
    if (!r.ok) return undefined;
    const m = (await r.text()).match(/"criticsScore":\{[^}]*\}/);
    const s = m && JSON.parse(m[0].slice('"criticsScore":'.length));
    return s && s.reviewCount > 0 && s.score ? Number(s.score) : null;
}

Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const body = await req.json().catch(() => ({}));
    const keys = [...new Set((body.keys || []).filter((k: unknown) => typeof k === 'string' && /^((movie|tv):\d{1,9}|ep:\d{1,9}:\d{1,3}:\d{1,4})$/.test(k)))]
        .slice(0, 100) as string[];
    // Episodes need their series' Rotten Tomatoes address, which is kept on the series' row.
    const shows = [...new Set(keys.filter(k => k.startsWith('ep:')).map(k => 'tv:' + k.split(':')[1]))];
    const out: Record<string, number | null> = {};
    const rows = new Map<string, Row>();

    const { data } = await db.from('rt_scores').select('key, score, url, fetched_at').in('key', [...keys, ...shows]);
    for (const r of (data || []) as Row[]) if (fresh(r)) rows.set(r.key, r);

    const save: Row[] = [];
    if (MDBLIST) {
        // A series row from before addresses were kept has a score but no address, so it's fetched again.
        const have = (k: string) => rows.has(k) && !(k.startsWith('tv:') && rows.get(k)!.score != null && !rows.get(k)!.url);
        for (const type of ['movie', 'tv']) {
            const ids = [...new Set([...keys, ...shows].filter(k => k.startsWith(type + ':') && !have(k)))].map(k => Number(k.split(':')[1]));
            if (!ids.length) continue;
            for (const r of await mdblist(type, ids) || []) {
                rows.set(r.key, r);
                save.push(r);
            }
        }
    }

    // Ten episode pages at a time, so a whole season doesn't hit Rotten Tomatoes at once.
    const eps = keys.filter(k => k.startsWith('ep:') && !rows.has(k));
    for (let i = 0; i < eps.length; i += 10) {
        await Promise.all(eps.slice(i, i + 10).map(async k => {
            const [, show, season, ep] = k.split(':');
            const url = rows.get('tv:' + show)?.url;
            if (!url) return;
            const score = await episode(url, season, ep);
            if (score === undefined) return;
            const r = { key: k, score, fetched_at: new Date().toISOString() };
            rows.set(k, r);
            save.push(r);
        }));
    }
    if (save.length) await db.from('rt_scores').upsert(save);

    for (const k of keys) if (rows.has(k)) out[k] = rows.get(k)!.score;
    return new Response(JSON.stringify(out), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
