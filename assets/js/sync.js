// Sync: My List, GOAT, history, watched episodes and where you stopped, shared by every device
// that picked the same profile. One Supabase row per profile, talked to with plain fetch.
// No sign-in: each device remembers the profile it picked. Each entry carries a timestamp
// and removals leave a marker, so merging keeps the newest change per title instead of
// bringing deleted things back.
(SM => {
    const SUPABASE = 'https://jbvkjvdthuzofvmhwctv.supabase.co';
    const KEY = 'sb_publishable_hbxcjbYF5H8py5gGLokxPg_tD9nGsNl';
    const { ls, esc, ui, library } = SM;
    const PROFILE = 'sm-profile', BASE = 'sm-sync-base', PROGRESS = 'sm-progress';
    const SECTIONS = ['watchlist', 'goat', 'history', 'watched', 'progress'];
    const KEEP_REMOVALS = 60 * 864e5;
    const isTV = () => document.documentElement.classList.contains('tv');

    // ---- Supabase ------------------------------------------------------------------------

    let profile = ls.get(PROFILE, '') || '';

    async function call(path, { method = 'GET', body, prefer } = {}) {
        const headers = { apikey: KEY, 'Content-Type': 'application/json' };
        if (prefer) headers.Prefer = prefer;
        const r = await fetch(SUPABASE + path, { method, headers, body: body && JSON.stringify(body) });
        const text = await r.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) {}
        if (!r.ok) throw new Error((data && (data.message || data.msg)) || 'HTTP ' + r.status);
        return data;
    }

    const profiles = () => call('/rest/v1/profiles?select=name&order=name').then(rows => rows.map(r => r.name));

    // ---- merging -------------------------------------------------------------------------

    const keyOf = item => item.type + '-' + item.id;

    // What this device has right now, with each entry's own time where it has one.
    function current() {
        const out = { watchlist: {}, goat: {}, history: {}, watched: {}, progress: {} };
        library.watchlist().forEach(item => { out.watchlist[keyOf(item)] = { own: item.addedAt, item }; });
        library.goat().forEach(item => { out.goat[keyOf(item)] = { own: item.addedAt, item }; });
        library.history().forEach(item => { out.history[keyOf(item)] = { own: item.updatedAt, item }; });
        library.watchedSet().forEach(k => { out.watched[k] = {}; });
        Object.entries(ls.get(PROGRESS, {}) || {}).forEach(([k, p]) => { out.progress[k] = { own: p.at, item: p }; });
        return out;
    }

    // Turns this device's state into timestamped entries by comparing it with the last merge.
    function localDoc(base, now) {
        const cur = current(), doc = {};
        SECTIONS.forEach(sec => {
            const was = base[sec] || {}, out = doc[sec] = {};
            Object.entries(cur[sec]).forEach(([k, { own, item }]) => {
                const b = was[k];
                const at = !b ? own || now : b.gone ? now : own || b.at;
                out[k] = item ? { at, item } : { at };
            });
            Object.entries(was).forEach(([k, b]) => {
                if (out[k]) return;
                // Gone here since the last merge means removed here (resume points are never removed).
                out[k] = b.gone || sec === 'progress' ? b : { at: now, gone: true };
            });
        });
        return doc;
    }

    function merge(a, b, now) {
        const doc = {};
        SECTIONS.forEach(sec => {
            const out = doc[sec] = {}, x = a[sec] || {}, y = b[sec] || {};
            new Set([...Object.keys(x), ...Object.keys(y)]).forEach(k => {
                const e = !y[k] || (x[k] && x[k].at >= y[k].at) ? x[k] : y[k];
                if (!(e.gone && now - e.at > KEEP_REMOVALS)) out[k] = e;
            });
        });
        return doc;
    }

    const alive = sec => Object.entries(sec || {}).filter(([, e]) => !e.gone);

    // Writes the merged state into the keys the rest of Heartive reads. Returns true if anything changed.
    function apply(doc) {
        const before = JSON.stringify([library.watchlist(), library.goat(), library.history(), [...library.watchedSet()].sort(), ls.get(PROGRESS, {})]);
        const byAdded = sec => alive(sec).map(([, e]) => e.item).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        const watchlist = byAdded(doc.watchlist), goat = byAdded(doc.goat);
        const history = alive(doc.history).map(([, e]) => e.item).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 60);
        const watched = alive(doc.watched).map(([k]) => k);
        const progress = {};
        alive(doc.progress).sort((a, b) => b[1].at - a[1].at).slice(0, 300).forEach(([k, e]) => { progress[k] = e.item; });
        if (JSON.stringify([watchlist, goat, history, [...watched].sort(), progress]) === before) return false;
        ls.set('sm-watchlist', watchlist);
        ls.set('sm-goat', goat);
        ls.set('sm-history', history);
        ls.set('watched', watched);
        ls.set(PROGRESS, progress);
        return true;
    }

    let running = null, again = false, lastSync = null, lastError = '', applying = false;

    async function run() {
        writeProgress();
        const now = Date.now();
        const rows = await call('/rest/v1/profiles?select=data&name=eq.' + encodeURIComponent(profile));
        const remote = (rows[0] && rows[0].data) || {};
        const merged = merge(localDoc(ls.get(BASE, {}) || {}, now), remote, now);
        applying = true;
        try {
            if (apply(merged)) SM.emit('library', { kind: 'sync' });
        } finally {
            applying = false;
        }
        if (JSON.stringify(merged) !== JSON.stringify(remote)) {
            await call('/rest/v1/profiles', {
                method: 'POST',
                prefer: 'resolution=merge-duplicates',
                body: { name: profile, data: merged, updated_at: new Date().toISOString() },
            });
        }
        ls.set(BASE, merged);
    }

    function sync() {
        if (!profile) return Promise.resolve();
        if (running) {
            again = true;
            return running;
        }
        running = run().then(() => {
            lastSync = new Date();
            lastError = '';
        }, e => {
            lastError = e.message || 'Sync failed';
            console.warn('[sync]', e);
        }).then(() => {
            running = null;
            render();
            if (again) {
                again = false;
                return sync();
            }
        });
        return running;
    }

    let timer = null;
    function soon(ms) {
        if (!profile) return;
        clearTimeout(timer);
        timer = setTimeout(sync, ms);
    }

    // The first profile a device picks takes in what the device already had. Switching later
    // swaps the library for the other profile's, so profiles never mix.
    function useProfile(name) {
        if (profile && name !== profile) {
            applying = true;
            try {
                ['sm-watchlist', 'sm-goat', 'sm-history', 'watched', PROGRESS].forEach(k => ls.remove(k));
                SM.emit('library', { kind: 'sync' });
            } finally {
                applying = false;
            }
        }
        if (name !== profile) ls.remove(BASE);
        profile = name;
        ls.set(PROFILE, name);
        render();
        return sync();
    }

    SM.on('library', () => { if (!applying) soon(2500); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    setInterval(() => { if (!document.hidden) sync(); }, 3 * 60e3);

    // ---- resume points ---------------------------------------------------------------------

    const progressKey = (type, id, season, episode) => type === 'tv' ? `tv-${id}-s${season}e${episode}` : `movie-${id}`;

    // The player always records what it opens in history first, so the newest entry is what's on.
    function playing() {
        const h = library.history()[0];
        return h ? progressKey(h.type, h.id, h.season, h.episode) : null;
    }

    // Players that can start at a given second, and the URL parameter each one reads.
    const START_PARAM = { vidstuck: 'progress', videasy: 'progress', vidking: 'progress', vidlink: 'startAt', vidfast: 'startAt', cinesrc: 't' };

    // Players that report their position do it in their own message shape; look for a current
    // time next to a duration anywhere in it.
    function findTime(data, depth = 0) {
        if (typeof data === 'string') {
            if (depth || data[0] !== '{') return null;
            try { data = JSON.parse(data); } catch (e) { return null; }
        }
        if (!data || typeof data !== 'object' || depth > 3) return null;
        const t = Number(data.currentTime ?? data.current_time ?? data.time ?? data.position);
        const d = Number(data.duration);
        if (isFinite(t) && t >= 0 && isFinite(d) && d > 0) return { t, d };
        for (const v of Object.values(data)) {
            const found = findTime(v, depth + 1);
            if (found) return found;
        }
        return null;
    }

    // Positions arrive about once a second; keep them, written every ten seconds.
    const pending = {};
    let flushTimer = null;
    function writeProgress() {
        clearTimeout(flushTimer);
        flushTimer = null;
        if (!Object.keys(pending).length) return;
        const all = ls.get(PROGRESS, {}) || {};
        Object.assign(all, pending);
        Object.keys(pending).forEach(k => delete pending[k]);
        ls.set(PROGRESS, all);
    }
    window.addEventListener('message', e => {
        const frame = document.querySelector('#modalRoot #pFrame iframe');
        if (!frame || e.source !== frame.contentWindow) return;
        const time = findTime(e.data), k = playing();
        if (!time || !k) return;
        pending[k] = { t: Math.floor(time.t), d: Math.floor(time.d), at: Date.now() };
        if (!flushTimer) flushTimer = setTimeout(() => {
            writeProgress();
            soon(15e3);
        }, 10e3);
    });

    // Seconds to start at, or 0 when it was barely started or already finished.
    function resumeAt(k) {
        const p = pending[k] || (ls.get(PROGRESS, {}) || {})[k];
        return p && p.t > 30 && p.t < p.d - 120 ? p.t : 0;
    }

    // The player's URL for `source`, set to start where this profile left off.
    function withResume(src, source) {
        const param = START_PARAM[source], k = playing();
        if (!param || !k) return src;
        const url = new URL(src), at = resumeAt(k);
        if (at) url.searchParams.set(param, at);
        else url.searchParams.delete(param);
        // Otherwise cinesrc asks "Resume watching?" inside the video, which a TV remote can't answer.
        if (source === 'cinesrc') url.searchParams.set('continueprompt', 'false');
        return url.href;
    }

    new MutationObserver(() => {
        const frame = document.querySelector('#modalRoot #pFrame iframe:not([data-resume])');
        const source = document.querySelector('#modalRoot #pSource');
        if (!frame || !source) return;
        frame.dataset.resume = '1';
        const was = frame.dataset.src || frame.src, src = withResume(was, source.value);
        if (src === was) return;
        // A fresh iframe, so the player's load guard starts counting from zero.
        const fresh = frame.cloneNode();
        fresh.src = src;
        if (frame.dataset.src) fresh.dataset.src = src;
        fresh.dataset.n = '0';
        frame.replaceWith(fresh);
    }).observe(document.getElementById('modalRoot'), { childList: true, subtree: true });

    // ---- profiles ---------------------------------------------------------------------------

    // Asks for a new profile name: a text box on desktop and phone, a keypad on the TV.
    function askName() {
        if (isTV()) return keypad('New profile', '', [...'abcdefghijklmnopqrstuvwxyz0123456789', ' ']);
        return Promise.resolve(window.prompt('Name for the new profile'));
    }

    async function pickProfile() {
        let names;
        try {
            names = await profiles();
        } catch (e) {
            return ui.toast("Couldn't load profiles: " + e.message, { icon: 'info' });
        }
        const modal = ui.openModal(`
            <div class="profile-pick">
                <h2>Who's watching?</h2>
                <div class="profile-list">
                    ${names.map(n => `<button type="button" class="profile${n === profile ? ' on' : ''}" data-profile="${esc(n)}">
                        <span class="profile-ic">${esc(n.slice(0, 1).toUpperCase())}</span><span>${esc(n)}</span></button>`).join('')}
                    <button type="button" class="profile profile-new" data-profile-new><span class="profile-ic">+</span><span>New profile</span></button>
                </div>
            </div>`, 'modal-profiles');
        modal.addEventListener('click', async e => {
            const b = e.target.closest('[data-profile], [data-profile-new]');
            if (!b) return;
            let name = b.dataset.profile;
            if (!name) {
                // The TV keypad opens in place of this; closing first would wipe it out, since
                // closeModal empties the modal root a moment later.
                if (!isTV()) ui.closeModal();
                name = ((await askName()) || '').trim().replace(/\s+/g, ' ').slice(0, 24);
                if (!name) return;
                const taken = names.find(n => n.toLowerCase() === name.toLowerCase());
                if (taken) name = taken;
                else name = name.replace(/\b\w/g, c => c.toUpperCase());
            } else {
                ui.closeModal();
            }
            await useProfile(name);
            ui.toast(`Watching as ${name}`, { icon: 'check' });
        });
    }

    function keypad(title, value, keys) {
        return new Promise(resolve => {
            const modal = ui.openModal(`
                <div class="sync-pad">
                    <h3>${esc(title)}</h3>
                    <div class="sync-pad-value"></div>
                    <div class="sync-pad-keys">${keys.map(k => `<button type="button" data-k="${esc(k)}">${k === ' ' ? 'Space' : esc(k)}</button>`).join('')}</div>
                    <div class="actions">
                        <button type="button" class="btn btn-sm btn-ghost" data-k="del">Delete</button>
                        <button type="button" class="btn btn-sm btn-ghost" data-k="clear">Clear</button>
                        <button type="button" class="btn btn-sm" data-k="done">Done</button>
                    </div>
                </div>`, 'modal-sync-pad');
            const out = modal.querySelector('.sync-pad-value');
            const show = () => { out.textContent = value || ' '; };
            show();
            let done = false;
            const finish = v => {
                if (done) return;
                done = true;
                off();
                resolve(v);
            };
            const off = SM.on('modal-close', () => finish(null));
            modal.addEventListener('click', e => {
                const b = e.target.closest('[data-k]');
                if (!b) return;
                const k = b.dataset.k;
                if (k === 'done') {
                    finish(value);
                    return ui.closeModal();
                }
                value = k === 'del' ? value.slice(0, -1) : k === 'clear' ? '' : (value + k).slice(0, 24);
                show();
            });
        });
    }

    // ---- settings panel ------------------------------------------------------------------------

    function panelHtml() {
        if (!profile) {
            return `<h2>Profile</h2>
                <p class="panel-note">Pick a profile to keep My List, GOAT, history and where you stopped the same on all your devices.</p>
                <div class="actions"><button class="btn btn-sm" data-sync="pick">Choose profile</button></div>`;
        }
        const when = lastSync ? lastSync.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
        return `<h2>Profile</h2>
            <p class="panel-note">Watching as <b>${esc(profile)}</b>. My List, GOAT, history, watched episodes and where you stopped
                stay the same on every device using this profile.</p>
            <p class="panel-note${lastError ? ' sync-error' : ''}">${lastError ? 'Last sync failed: ' + esc(lastError) : running ? 'Syncing…' : when ? 'Last synced ' + when : ''}</p>
            <div class="actions">
                <button class="btn btn-sm" data-sync="now"${running ? ' disabled' : ''}>Sync now</button>
                <button class="btn btn-sm btn-ghost" data-sync="pick">Switch profile</button>
            </div>`;
    }

    function render() {
        const panel = document.getElementById('sync');
        if (panel) panel.innerHTML = panelHtml();
    }

    document.addEventListener('click', e => {
        const b = e.target.closest('#sync [data-sync]');
        if (!b) return;
        if (b.dataset.sync === 'now') sync();
        else pickProfile();
    });

    // The settings page is rebuilt on every visit; put the panel back above "Your data".
    const view = document.getElementById('view');
    new MutationObserver(() => {
        const data = view.querySelector('#data');
        if (!data || document.getElementById('sync')) return;
        const panel = document.createElement('section');
        panel.className = 'panel';
        panel.id = 'sync';
        data.before(panel);
        render();
    }).observe(view, { childList: true, subtree: true });

    // A device that hasn't picked yet asks once it has finished loading; after that it remembers.
    if (profile) sync();
    else setTimeout(pickProfile, 1500);

    SM.sync = { now: sync, withResume, canResume: source => !!START_PARAM[source], pickProfile };
})(window.SM);
