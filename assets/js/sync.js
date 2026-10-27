// Sync: My List, GOAT, history, watched episodes and where you stopped, shared by every device
// signed in to the same account. Accounts are a username and password (supabase/accounts.sql);
// a device keeps the sign-in token it got, never the password. Each entry carries a timestamp
// and removals leave a marker, so merging keeps the newest change per title instead of
// bringing deleted things back.
(SM => {
    const SUPABASE = 'https://jbvkjvdthuzofvmhwctv.supabase.co';
    const KEY = 'sb_publishable_hbxcjbYF5H8py5gGLokxPg_tD9nGsNl';
    // Where people write when they forget their password; reset it as supabase/accounts.sql says.
    const CONTACT = 'jonathanbernard265@gmail.com';
    // Where a phone signs in a TV (link/index.html); the TV runs from a file, so it's spelled out.
    const LINK = 'https://jbw9.github.io/movies/link/';
    const { ls, esc, ui, library } = SM;
    const ACCOUNT = 'sm-account', BASE = 'sm-sync-base', PROGRESS = 'sm-progress';
    const SECTIONS = ['watchlist', 'goat', 'history', 'log', 'watched', 'progress'];
    const LIBRARY_KEYS = ['sm-watchlist', 'sm-goat', 'sm-history', 'sm-log', 'watched', PROGRESS];
    const KEEP_REMOVALS = 60 * 864e5;
    const isTV = () => document.documentElement.classList.contains('tv');

    // ---- Supabase ------------------------------------------------------------------------

    let account = ls.get(ACCOUNT, null); // { username, token }

    async function call(path, { method = 'GET', body, prefer } = {}) {
        const headers = { apikey: KEY, 'Content-Type': 'application/json' };
        if (prefer) headers.Prefer = prefer;
        let r;
        try {
            r = await fetch(SUPABASE + path, { method, headers, body: body && JSON.stringify(body) });
        } catch (e) {
            throw new Error("Couldn't reach the server. Check your connection.");
        }
        const text = await r.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) {}
        if (!r.ok) throw new Error((data && (data.message || data.msg)) || 'HTTP ' + r.status);
        return data;
    }

    const rpc = (fn, args) => call('/rest/v1/rpc/' + fn, { method: 'POST', body: args });

    // ---- merging -------------------------------------------------------------------------

    const keyOf = item => item.type + '-' + item.id;

    // What this device has right now, with each entry's own time where it has one.
    function current() {
        const out = { watchlist: {}, goat: {}, history: {}, log: {}, watched: {}, progress: {} };
        library.watchlist().forEach(item => { out.watchlist[keyOf(item)] = { own: item.addedAt, item }; });
        library.goat().forEach(item => { out.goat[keyOf(item)] = { own: item.addedAt, item }; });
        library.history().forEach(item => { out.history[keyOf(item)] = { own: item.updatedAt, item }; });
        library.log().forEach(item => { out.log[item.key] = { own: item.at, item }; });
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

    // Writes the merged state into the keys the rest of the site reads. Returns true if anything changed.
    function apply(doc) {
        const before = JSON.stringify([library.watchlist(), library.goat(), library.history(), library.log(), [...library.watchedSet()].sort(), ls.get(PROGRESS, {})]);
        const byAdded = sec => alive(sec).map(([, e]) => e.item).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        const watchlist = byAdded(doc.watchlist), goat = byAdded(doc.goat);
        const history = alive(doc.history).map(([, e]) => e.item).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 60);
        const log = alive(doc.log).map(([, e]) => e.item).sort((a, b) => b.at - a.at).slice(0, 500);
        const watched = alive(doc.watched).map(([k]) => k);
        const progress = {};
        alive(doc.progress).sort((a, b) => b[1].at - a[1].at).slice(0, 300).forEach(([k, e]) => { progress[k] = e.item; });
        if (JSON.stringify([watchlist, goat, history, log, [...watched].sort(), progress]) === before) return false;
        ls.set('sm-watchlist', watchlist);
        ls.set('sm-goat', goat);
        ls.set('sm-history', history);
        ls.set('sm-log', log);
        ls.set('watched', watched);
        ls.set(PROGRESS, progress);
        return true;
    }

    let running = null, again = false, lastSync = null, lastError = '', applying = false;

    async function run() {
        writeProgress();
        const now = Date.now(), { token } = account;
        let remote;
        try {
            remote = (await rpc('load_account', { tok: token, dev: deviceName() })).data || {};
        } catch (e) {
            // The password was reset, or this device was signed out from elsewhere.
            if (e.message === 'Signed out' && account && account.token === token) {
                clearLocal();
                ui.toast('You were signed out. Sign in again to keep syncing.', { icon: 'info', ms: 6000 });
            }
            throw e;
        }
        const merged = merge(localDoc(ls.get(BASE, {}) || {}, now), remote, now);
        applying = true;
        try {
            if (apply(merged)) SM.emit('library', { kind: 'sync' });
        } finally {
            applying = false;
        }
        if (JSON.stringify(merged) !== JSON.stringify(remote)) await rpc('save_account', { tok: token, doc: merged });
        ls.set(BASE, merged);
    }

    function sync() {
        if (!account) return Promise.resolve();
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
        if (!account) return;
        clearTimeout(timer);
        timer = setTimeout(sync, ms);
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

    // ---- visits ----------------------------------------------------------------------------

    // One visit per page load, signed in or not, with roughly where from, for the admin page
    // (supabase/accounts.sql). The place is looked up from this browser's IP at most once a day.
    const VISITOR = 'sm-visitor', GEO = 'sm-geo';
    let visitor = ls.get(VISITOR, null);
    if (!visitor) {
        visitor = '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        ls.set(VISITOR, visitor);
    }

    async function trackVisit() {
        let geo = ls.get(GEO, null);
        if (!geo || Date.now() - geo.at > 864e5) {
            try {
                const g = await (await fetch('https://get.geojs.io/v1/ip/geo.json')).json();
                geo = { at: Date.now(), cc: g.country_code, country: g.country, region: g.region, city: g.city };
                ls.set(GEO, geo);
            } catch (e) {
                geo = geo || {};
            }
        }
        rpc('track_visit', { vid: visitor, tok: account ? account.token : null, cc: geo.cc || null,
            country: geo.country || null, region: geo.region || null, city: geo.city || null }).catch(() => {});
    }

    let watchSecs = 0, lastPos = null;
    function flushWatch() {
        const secs = Math.round(watchSecs);
        if (secs < 1) return;
        watchSecs -= secs;
        rpc('add_watch_time', { vid: visitor, secs, tok: account ? account.token : null }).catch(() => {});
    }
    setInterval(flushWatch, 60e3);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushWatch(); });

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
        // Small forward steps are playback; bigger jumps are seeking and don't count as watching.
        if (lastPos && lastPos.k === k && time.t > lastPos.t && time.t - lastPos.t <= 5) watchSecs += time.t - lastPos.t;
        lastPos = { k, t: time.t };
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

    // The player's URL for `source`, set to start where this account left off. player.js builds
    // every player URL through this, so the video loads once instead of being swapped after.
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

    // ---- accounts ---------------------------------------------------------------------------

    // How this device is listed under "Signed-in devices", e.g. "Chrome on Mac".
    function deviceName() {
        if (isTV()) return 'TV';
        const ua = navigator.userAgent;
        const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad'
            : /Android/.test(ua) ? 'Android' : /CrOS/.test(ua) ? 'Chromebook' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'a device';
        const browser = /Edg/.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : '';
        return browser ? `${browser} on ${os}` : os;
    }

    // The settings button shows the signed-in person's initial.
    function avatar() {
        document.querySelectorAll('[data-avatar]').forEach(el => {
            el.innerHTML = account ? `<span class="avatar">${esc(account.username[0].toUpperCase())}</span>` : SM.icon('user');
        });
    }

    // The first account a device signs in to takes in what the device already had. Signing out
    // empties the device, so the next person starts from their own account.
    function useAccount(username, token) {
        ls.remove(BASE);
        ls.remove('sm-profile');
        account = { username, token };
        ls.set(ACCOUNT, account);
        render();
        return sync();
    }

    function clearLocal() {
        applying = true;
        try {
            Object.keys(pending).forEach(k => delete pending[k]);
            LIBRARY_KEYS.forEach(k => ls.remove(k));
            SM.emit('library', { kind: 'sync' });
        } finally {
            applying = false;
        }
        ls.remove(BASE);
        ls.remove(ACCOUNT);
        account = null;
        devices = null;
        lastSync = null;
        lastError = '';
        render();
    }

    async function signIn(username, password, create) {
        username = username.trim().toLowerCase();
        const token = await rpc(create ? 'sign_up' : 'sign_in', { uname: username, pw: password, dev: deviceName() });
        await useAccount(username, token);
        ui.toast(create ? `Account created. Welcome, ${username}!` : `Signed in as ${username}`, { icon: 'check' });
    }

    async function signOut() {
        await sync(); // send the last changes first
        const token = account && account.token;
        clearLocal();
        if (token) rpc('sign_out', { tok: token }).catch(() => {});
        ui.toast('Signed out', { icon: 'check' });
    }

    const forgotNote = () => `Forgot your password? Email <a href="mailto:${CONTACT}?subject=${encodeURIComponent('Movies password reset')}">${CONTACT}</a>
        with your username and you'll get a new one.`;

    // A password box with an eye button that shows what was typed.
    const passwordInput = (name, autocomplete) => `<span class="auth-pw"><input name="${name}" type="password" autocomplete="${autocomplete}">
        <button type="button" class="auth-eye" aria-label="Show password" aria-pressed="false">${SM.icon('eye')}</button></span>`;

    document.addEventListener('click', e => {
        const b = e.target.closest('.auth-eye');
        if (!b) return;
        const input = b.previousElementSibling, show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        b.innerHTML = SM.icon(show ? 'spoiler' : 'eye');
        b.setAttribute('aria-pressed', show);
        b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });

    // A real form, so password managers offer to save and fill it.
    function authForm(mode) {
        const create = mode === 'up';
        const modal = ui.openModal(`
            <form class="auth" novalidate>
                <button type="button" class="icon-btn auth-x" data-close aria-label="Close">${SM.icon('x')}</button>
                <h2>${create ? 'Create an account' : 'Sign in'}</h2>
                <p class="panel-note">Keep My List, GOAT, history and where you stopped the same on all your devices.</p>
                <label class="auth-field"><span>Username</span>
                    <input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="24"></label>
                <label class="auth-field"><span>Password</span>
                    ${passwordInput('password', create ? 'new-password' : 'current-password')}</label>
                <p class="auth-error" role="alert"></p>
                <button class="btn" type="submit">${create ? 'Create account' : 'Sign in'}</button>
                <p class="auth-switch">${create ? 'Already have an account?' : 'New here?'}
                    <button type="button" data-auth="${create ? 'in' : 'up'}">${create ? 'Sign in' : 'Create an account'}</button></p>
                <p class="panel-note auth-forgot">${forgotNote()}</p>
            </form>`, 'modal-auth');
        const form = modal.querySelector('form'), f = form.elements, err = modal.querySelector('.auth-error');
        f.username.focus();
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (!f.username.value.trim() || !f.password.value) return (err.textContent = 'Enter a username and a password.');
            const submit = form.querySelector('[type="submit"]');
            submit.disabled = true;
            err.textContent = '';
            try {
                await signIn(f.username.value, f.password.value, create);
                // Opens in place of this one; closing first would take the new one down with it.
                if (afterSignIn) afterSignIn();
                else ui.closeModal();
            } catch (e) {
                err.textContent = e.message;
                submit.disabled = false;
            }
        });
        modal.querySelector('[data-auth]').addEventListener('click', e => authForm(e.currentTarget.dataset.auth));
    }

    // A QR code as an SVG, with the quiet zone scanners need around it.
    function qrSvg(text) {
        const rows = qrMatrix(text), q = 4, size = rows.length + 2 * q;
        let d = '';
        rows.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x + q} ${y + q}h1v1h-1z`; }));
        return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
    }

    // The TV signs in the way streaming apps do: it shows a code and a QR code of LINK with it,
    // and a phone that's signed in enters the code. Typing on the keypad is still there.
    function tvAuth() {
        const modal = ui.openModal(`
            <div class="auth tv-link">
                <h2>Sign in to Movies</h2>
                <div class="tv-link-body">
                    <div class="tv-link-qr"></div>
                    <div>
                        <p class="panel-note">Scan the QR code with your phone, or go to</p>
                        <p class="tv-link-url">${esc(LINK.replace(/^https:\/\/|\/$/g, ''))}</p>
                        <p class="panel-note">and enter</p>
                        <p class="tv-link-code">&nbsp;</p>
                    </div>
                </div>
                <div class="actions">
                    <button type="button" class="btn btn-ghost" data-tv-auth="in">Sign in on the TV</button>
                    <button type="button" class="btn btn-ghost" data-tv-auth="up">Create account</button>
                    <button type="button" class="btn btn-ghost" data-close>Not now</button>
                </div>
                <p class="panel-note auth-forgot">Forgot your password? Email ${CONTACT} with your username and you'll get a new one.</p>
            </div>`, 'modal-auth modal-tv-link');

        // A code lasts 10 minutes (supabase/accounts.sql); a new one replaces it when it runs out.
        let code = null, stopped = false;
        const off = SM.on('modal-close', () => stop());
        function stop() {
            stopped = true;
            off();
        }
        async function poll() {
            if (stopped) return;
            try {
                if (!code) {
                    code = await rpc('start_device_code', { dev: deviceName() });
                    if (stopped) return;
                    modal.querySelector('.tv-link-qr').innerHTML = qrSvg(LINK + '?c=' + code.code);
                    modal.querySelector('.tv-link-code').textContent = code.code;
                } else {
                    const got = await rpc('poll_device_code', { c: code.code, sec: code.secret });
                    if (got && !stopped) {
                        stop();
                        ui.closeModal();
                        await useAccount(got.username, got.token);
                        return ui.toast(`Signed in as ${got.username}`, { icon: 'check' });
                    }
                }
            } catch (e) {
                if (e.message === 'Expired') code = null;
            }
            setTimeout(poll, 3000);
        }
        poll();

        modal.addEventListener('click', async e => {
            const b = e.target.closest('[data-tv-auth]');
            if (!b) return;
            stop();
            const username = await keypad('Username', [...'abcdefghijklmnopqrstuvwxyz0123456789._-'], 24);
            const password = username && await keypad('Password', [...'abcdefghijklmnopqrstuvwxyz0123456789.-_!@#?'], 64, true);
            if (!password) return ui.closeModal();
            try {
                await signIn(username, password, b.dataset.tvAuth === 'up');
                ui.closeModal();
            } catch (err) {
                ui.closeModal();
                ui.toast(err.message, { icon: 'info', ms: 5000 });
            }
        });
    }

    const openAuth = mode => isTV() ? tvAuth() : authForm(mode);

    // ---- signing in a TV from a phone ----------------------------------------------------------

    // Set when the TV's link is opened signed out: it carries on once signed in.
    let afterSignIn = null;

    function linkForm(code) {
        afterSignIn = null;
        const modal = ui.openModal(`
            <form class="auth" novalidate>
                <button type="button" class="icon-btn auth-x" data-close aria-label="Close">${SM.icon('x')}</button>
                <h2>Sign in on a TV</h2>
                <p class="panel-note">Enter the code on the TV to sign it in as <b>${esc(account.username)}</b>.</p>
                <label class="auth-field"><span>Code</span>
                    <input name="code" value="${esc(code)}" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="8"></label>
                <p class="auth-error" role="alert"></p>
                <button class="btn" type="submit">Sign in TV</button>
            </form>`, 'modal-auth');
        const form = modal.querySelector('form'), f = form.elements, err = modal.querySelector('.auth-error');
        if (!code) f.code.focus();
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const c = f.code.value.replace(/[^a-z0-9]/gi, '').toUpperCase();
            if (!c) return (err.textContent = 'Enter the code shown on the TV.');
            const submit = form.querySelector('[type="submit"]');
            submit.disabled = true;
            err.textContent = '';
            try {
                await rpc('approve_device_code', { tok: account.token, c });
                ui.closeModal();
                ui.toast('Your TV is signed in', { icon: 'check' });
                loadDevices();
            } catch (e) {
                err.textContent = e.message;
                submit.disabled = false;
            }
        });
    }

    function linkTv(code) {
        if (account) return linkForm(code);
        afterSignIn = () => linkForm(code);
        authForm('in');
    }

    function passwordForm() {
        const modal = ui.openModal(`
            <form class="auth" novalidate>
                <button type="button" class="icon-btn auth-x" data-close aria-label="Close">${SM.icon('x')}</button>
                <h2>Change password</h2>
                <input name="username" autocomplete="username" value="${esc(account.username)}" hidden>
                <label class="auth-field"><span>Current password</span>${passwordInput('old', 'current-password')}</label>
                <label class="auth-field"><span>New password</span>${passwordInput('new', 'new-password')}</label>
                <p class="auth-error" role="alert"></p>
                <button class="btn" type="submit">Change password</button>
            </form>`, 'modal-auth');
        const form = modal.querySelector('form'), f = form.elements, err = modal.querySelector('.auth-error');
        f.old.focus();
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const submit = form.querySelector('[type="submit"]');
            submit.disabled = true;
            err.textContent = '';
            try {
                await rpc('change_password', { tok: account.token, old_pw: f.old.value, new_pw: f.new.value });
                ui.closeModal();
                ui.toast('Password changed', { icon: 'check' });
            } catch (e) {
                err.textContent = e.message;
                submit.disabled = false;
            }
        });
    }

    // Resolves with what was typed, or null if closed. It leaves its modal open on Done, so the
    // next keypad can open in its place; the caller closes the last one.
    function keypad(title, keys, max, secret) {
        return new Promise(resolve => {
            let value = '', upper = false;
            const modal = ui.openModal(`
                <div class="sync-pad">
                    <h3>${esc(title)}</h3>
                    <div class="sync-pad-value"></div>
                    <div class="sync-pad-keys">${keys.map(k => `<button type="button" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>
                    <div class="actions">
                        ${secret ? '<button type="button" class="btn btn-sm btn-ghost" data-k="shift">Shift</button>' : ''}
                        <button type="button" class="btn btn-sm btn-ghost" data-k="del">Delete</button>
                        <button type="button" class="btn btn-sm btn-ghost" data-k="clear">Clear</button>
                        <button type="button" class="btn btn-sm" data-k="done">Done</button>
                    </div>
                </div>`, 'modal-sync-pad');
            const out = modal.querySelector('.sync-pad-value');
            const show = () => { out.textContent = (secret ? '•'.repeat(value.length) : value) || ' '; };
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
                if (k === 'done') return finish(value || null);
                if (k === 'shift') {
                    upper = !upper;
                    b.classList.toggle('on', upper);
                    modal.querySelectorAll('.sync-pad-keys [data-k]').forEach(key => { key.textContent = upper ? key.dataset.k.toUpperCase() : key.dataset.k; });
                    return;
                }
                value = k === 'del' ? value.slice(0, -1) : k === 'clear' ? '' : (value + (upper ? k.toUpperCase() : k)).slice(0, max);
                show();
            });
        });
    }

    // ---- settings panel ------------------------------------------------------------------------

    let devices = null;

    async function loadDevices() {
        if (!account) return;
        try {
            devices = await rpc('list_sessions', { tok: account.token });
        } catch (e) {
            devices = null;
        }
        const list = document.getElementById('devices');
        if (list) list.innerHTML = devicesHtml();
    }

    function devicesHtml() {
        if (!devices) return '';
        return `<h3>Signed-in devices</h3>
            <ul class="devices">${devices.map(d => `
                <li>
                    <span class="device-name">${esc(d.device || 'Unknown device')}${d.current ? ' <small>This device</small>' : ''}</span>
                    <span class="device-seen">${d.current ? 'Active now' : 'Active ' + esc(SM.timeAgo(new Date(d.last_seen).getTime()))}</span>
                    <button class="btn btn-sm btn-ghost" data-sync="${d.current ? 'out' : 'end'}" data-id="${d.id}">Sign out</button>
                </li>`).join('')}</ul>`;
    }

    function panelHtml() {
        if (!account) {
            return `<h2>Account</h2>
                <p class="panel-note">Sign in to keep My List, GOAT, history and where you stopped the same on all your devices.</p>
                <div class="actions">
                    <button class="btn btn-sm" data-sync="in">Sign in</button>
                    <button class="btn btn-sm btn-ghost" data-sync="up">Create account</button>
                </div>`;
        }
        const when = lastSync ? lastSync.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
        return `<h2>Account</h2>
            <p class="panel-note">Signed in as <b>${esc(account.username)}</b>. My List, GOAT, history, watched episodes and where you stopped
                stay the same on every device you sign in on.</p>
            <p class="panel-note${lastError ? ' sync-error' : ''}">${lastError ? 'Last sync failed: ' + esc(lastError) : running ? 'Syncing…' : when ? 'Last synced ' + when : ''}</p>
            <div class="actions">
                <button class="btn btn-sm" data-sync="now"${running ? ' disabled' : ''}>Sync now</button>
                ${isTV() ? '' : '<button class="btn btn-sm btn-ghost" data-sync="password">Change password</button>'}
                ${isTV() ? '' : '<button class="btn btn-sm btn-ghost" data-sync="tv">Sign in a TV</button>'}
                <button class="btn btn-sm btn-ghost" data-sync="out">Sign out</button>
            </div>
            <div id="devices">${devicesHtml()}</div>`;
    }

    function render() {
        const panel = document.getElementById('sync');
        if (panel) panel.innerHTML = panelHtml();
        avatar();
    }

    document.addEventListener('click', e => {
        const b = e.target.closest('#sync [data-sync]');
        if (!b) return;
        const action = b.dataset.sync;
        if (action === 'now') sync();
        else if (action === 'out') signOut();
        else if (action === 'password') passwordForm();
        else if (action === 'tv') linkTv('');
        else if (action === 'end') {
            b.disabled = true;
            rpc('end_session', { tok: account.token, sid: Number(b.dataset.id) })
                .then(() => ui.toast('Signed out that device', { icon: 'check' }), e => ui.toast(e.message, { icon: 'info' }))
                .then(loadDevices);
        } else openAuth(action);
    });

    // The settings page is rebuilt on every visit; put the panel back at the top.
    const view = document.getElementById('view');
    new MutationObserver(() => {
        const first = view.querySelector('.settings .panel');
        if (!first || document.getElementById('sync')) return;
        const panel = document.createElement('section');
        panel.className = 'panel';
        panel.id = 'sync';
        first.before(panel);
        render();
        loadDevices();
    }).observe(view, { childList: true, subtree: true });

    // The TV's QR code lands here as ?link=CODE (link/index.html); take it out of the address.
    const query = new URLSearchParams(location.search), linkCode = query.get('link');
    if (linkCode !== null) {
        query.delete('link');
        history.replaceState(history.state, '', location.pathname + (String(query) ? '?' + query : '') + location.hash);
        linkTv(linkCode);
    }

    // A signed-out device asks once it has finished loading, unless something is already open.
    avatar();
    trackVisit();
    if (account) sync();
    else setTimeout(() => { if (!account && !document.querySelector('#modalRoot .modal')) openAuth('in'); }, 1500);

    SM.sync = { now: sync, withResume, canResume: source => !!START_PARAM[source], openAuth, avatar };
})(window.SM);
