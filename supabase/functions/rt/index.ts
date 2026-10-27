// Rotten Tomatoes scores for the site (assets/js/ratings.js), shared by everyone: POST {keys: ["movie:550",
// "tv:2190"]} answers {"movie:550": 81, "tv:2190": 80}, null where there's no score. Scores live in
// rt_scores (supabase/accounts.sql); the ones missing or old are fetched from MDBList in one request per
// type, with the key in the MDBLIST_KEY secret. Deployed with verify_jwt off, since the site calls it with
// the publishable key.
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const MDBLIST = Deno.env.get('MDBLIST_KEY');
const DAY = 864e5;
const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const body = await req.json().catch(() => ({}));
    const keys = [...new Set((body.keys || []).filter((k: unknown) => typeof k === 'string' && /^(movie|tv):\d{1,9}$/.test(k)))]
        .slice(0, 100) as string[];
    const out: Record<string, number | null> = {};

    const { data } = await db.from('rt_scores').select('key, score, fetched_at').in('key', keys);
    for (const r of data || []) {
        // A score is good for a month; no score is asked about again after a week, in case one appeared.
        const age = Date.now() - new Date(r.fetched_at).getTime();
        if (age < (r.score == null ? 7 : 30) * DAY) out[r.key] = r.score;
    }

    const missing = keys.filter(k => !(k in out));
    if (MDBLIST && missing.length) {
        const rows: { key: string; score: number | null; fetched_at: string }[] = [];
        for (const type of ['movie', 'tv']) {
            const ids = missing.filter(k => k.startsWith(type + ':')).map(k => Number(k.split(':')[1]));
            if (!ids.length) continue;
            const r = await fetch(`https://api.mdblist.com/tmdb/${type === 'tv' ? 'show' : 'movie'}?apikey=${MDBLIST}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            if (!r.ok) continue;
            const found = new Map<number, number | null>();
            for (const item of await r.json()) {
                found.set(item.ids?.tmdb, (item.ratings || []).find((x: { source: string }) => x.source === 'tomatoes')?.value ?? null);
            }
            for (const id of ids) {
                const key = `${type}:${id}`;
                out[key] = found.get(id) ?? null;
                rows.push({ key, score: out[key], fetched_at: new Date().toISOString() });
            }
        }
        if (rows.length) await db.from('rt_scores').upsert(rows);
    }

    return new Response(JSON.stringify(out), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
