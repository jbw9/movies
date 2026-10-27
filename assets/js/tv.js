// TV mode: a remote-control layout for Samsung TVs (Tizen). It only switches on when
// running on the TV, or in a browser opened once with ?tv=1 (?tv=0 turns it back off).
// Desktop and phone never get the .tv class, so nothing here touches them.
(SM => {
    const params = new URLSearchParams(location.search);
    if (params.has('tv')) SM.ls.set('movies-tv', params.get('tv') === '0' ? 'no' : 'yes');
    const isTizen = typeof window.tizen !== 'undefined' && !!window.tizen.application;
    if (!isTizen && SM.ls.get('movies-tv', 'no') !== 'yes') return;

    const { esc, icon, ui, library, api } = SM;
    const LAUNCHER_ID = 'SkrFlap001.SeekerFlap';
    const view = document.getElementById('view');
    document.documentElement.classList.add('tv');

    // ---- streaming apps on the TV ------------------------------------------------------

    // `provider` matches TMDB's watch-provider names, `app` the app names the TV reports.
    // Order matters: "Max Amazon Channel" is watched in Prime Video, so Amazon is checked first.
    const APPS = [
        { key: 'netflix', label: 'Netflix', provider: /netflix/i, app: /^netflix/ },
        { key: 'prime', label: 'Prime Video', provider: /amazon|prime video/i, app: /prime video|amazon prime/ },
        { key: 'appletv', label: 'Apple TV', provider: /apple tv/i, app: /^apple tv/ },
        { key: 'disney', label: 'Disney+', provider: /disney/i, app: /disney/ },
        { key: 'hulu', label: 'Hulu', provider: /hulu/i, app: /^hulu/ },
        { key: 'max', label: 'Max', provider: /^(hbo )?max\b/i, app: /^(hbo )?max$/ },
        { key: 'peacock', label: 'Peacock', provider: /peacock/i, app: /peacock/ },
        { key: 'paramount', label: 'Paramount+', provider: /paramount/i, app: /paramount/ },
        { key: 'youtube', label: 'YouTube', provider: /youtube/i, app: /^youtube$/ },
        { key: 'tubi', label: 'Tubi', provider: /tubi/i, app: /^tubi/ },
        { key: 'pluto', label: 'Pluto TV', provider: /pluto/i, app: /pluto/ },
        { key: 'crunchyroll', label: 'Crunchyroll', provider: /crunchyroll/i, app: /crunchyroll/ },
        { key: 'starz', label: 'Starz', provider: /starz/i, app: /starz/ },
    ];
    const installed = {}; // app key -> Tizen app id

    if (isTizen) {
        try {
            tizen.application.getAppsInfo(list => list.forEach(info => {
                const name = String(info.name || '').trim().toLowerCase();
                APPS.forEach(a => { if (!installed[a.key] && a.app.test(name)) installed[a.key] = info.id; });
            }), () => {});
        } catch (e) {}
    }

    const appFor = providerName => APPS.find(a => a.provider.test(providerName)) || null;

    function launchApp(a) {
        if (!isTizen) return ui.toast('Preview: this would open ' + a.label, { icon: 'info' });
        const id = installed[a.key];
        if (!id) return ui.toast(a.label + " isn't installed on this TV", { icon: 'info' });
        tizen.application.launch(id, () => {}, () => ui.toast("Couldn't open " + a.label, { icon: 'info' }));
    }

    function exitApp() {
        if (!isTizen) return ui.toast('Preview: this would return to the launcher', { icon: 'info' });
        const quit = () => { try { tizen.application.getCurrentApplication().exit(); } catch (e) {} };
        try { tizen.application.launch(LAUNCHER_ID, quit, quit); } catch (e) { quit(); }
    }

    // ---- "Where to watch" sheet, used when there are no embed sources ------------------

    if (typeof _embeds === 'undefined' || !_embeds.length) SM.player.play = async (item, opts) => {
        item = ui.lookup(SM.keyOf(item.type, item.id)) || item;
        const isSeries = item.type === 'tv';
        const modal = ui.openModal(`
            <div class="tv-watch">
                <p class="eyebrow">Where to watch</p>
                <h2>${esc(item.title)}</h2>
                <div class="tv-apps">${'<span class="tv-app skeleton"></span>'.repeat(3)}</div>
            </div>`, 'modal-tv-watch');

        let providers, ep = opts || null;
        try {
            const [p, next] = await Promise.all([
                api.tmdb(`/${item.type}/${item.id}/watch/providers`),
                isSeries && !ep ? SM.player.nextUp(item.id) : null,
            ]);
            providers = (p.results || {})[SM.region] || (p.results || {}).US || {};
            if (next) ep = next;
        } catch (e) {
            ui.closeModal();
            return ui.toast("Couldn't check where this is streaming", { icon: 'info' });
        }
        if (!modal.isConnected) return;

        // One tile per TV app; channels like "Starz Amazon Channel" fold into their host app.
        const tiles = new Map(), elsewhere = [];
        const add = (list, note) => (list || []).forEach(p => {
            const a = appFor(p.provider_name);
            if (!a) return elsewhere.includes(p.provider_name) || elsewhere.push(p.provider_name);
            if (!tiles.has(a.key)) tiles.set(a.key, { app: a, note, logo: api.img(p.logo_path, 'w154') });
        });
        add(providers.flatrate, 'Included');
        add(providers.free, 'Free');
        add(providers.ads, 'Free with ads');
        add(providers.rent, 'Rent');
        add(providers.buy, 'Buy');

        const episode = isSeries && ep ? `S${ep.season} · E${ep.episode}` : '';
        const tile = ({ app, note, logo }) => {
            const missing = isTizen && !installed[app.key];
            return `<button class="tv-app${missing ? ' missing' : ''}" data-tv-app="${app.key}">
                    ${logo ? `<img src="${esc(logo)}" alt="">` : ''}
                    <span><strong>${esc(app.label)}</strong><small>${missing ? 'Not installed' : note}</small></span>
                </button>`;
        };
        modal.querySelector('.tv-watch').innerHTML = `
            <p class="eyebrow">Where to watch${episode ? ' · up next ' + episode : ''}</p>
            <h2>${esc(item.title)}</h2>
            ${tiles.size
                ? `<div class="tv-apps">${[...tiles.values()].map(tile).join('')}</div>
                   <p class="tv-watch-hint">${icon('info')} Opens the app. Search there for “${esc(item.title)}”${episode ? ' and pick ' + episode : ''}.</p>`
                : `<p class="tv-watch-none">Not streaming on any of your TV apps${providers.link ? ' in your region' : ''} right now.</p>`}
            ${elsewhere.length ? `<p class="tv-watch-hint">Also on ${esc(elsewhere.slice(0, 5).join(', '))}</p>` : ''}
            <div class="actions"><button class="btn btn-lg btn-glass" data-close>Close</button></div>`;

        modal.addEventListener('click', e => {
            const b = e.target.closest('[data-tv-app]');
            if (!b) return;
            library.pushHistory(item, episode ? { season: ep.season, episode: ep.episode } : {});
            ui.closeModal();
            launchApp(tiles.get(b.dataset.tvApp).app);
        });
        focusEl(modal.querySelector('.tv-app') || modal.querySelector('[data-close]'));
    };

    // ---- embed player, driven by the remote ------------------------------------------------
    // Focus never goes inside the player's iframe: that cross-origin page would swallow every
    // remote key, Back included. The video is one focusable tile instead: OK pauses, OK twice
    // toggles full screen, OK three times reloads it, left and right skip 15 seconds.

    // cinesrc and vidstuck take a subtitle language in their URL (both match the track's name).
    const SUBS = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Off'];
    const subtitle = () => SM.ls.get('movies-tv-subs', 'English');
    const playerModal = () => document.querySelector('#modalRoot .modal-player');
    const isFull = () => !!document.querySelector('#modalRoot .modal-player.tv-full');

    function tunePlayer(modal) {
        if (!modal.dataset.tv) {
            modal.dataset.tv = '1';
            const subs = document.createElement('label');
            subs.className = 'source-pick tv-subs';
            subs.innerHTML = `<span class="sources-label">Subtitles</span>
                <select id="pSubs" aria-label="Subtitles">${SUBS.map(s => `<option${s === subtitle() ? ' selected' : ''}>${s}</option>`).join('')}</select>`;
            modal.querySelector('.player-bar .source-pick').after(subs);
            subs.querySelector('select').addEventListener('change', e => {
                SM.ls.set('movies-tv-subs', e.target.value);
                const old = modal.querySelector('#pFrame iframe');
                if (old) delete old.dataset.tv;
                tunePlayer(modal);
            });
            modal.querySelector('.player-hint').innerHTML = `${icon('info')} On the video: OK to pause, twice for full screen, three times to reload. Left and right skip 15 seconds. Back goes to Home.`;
            focusEl(modal.querySelector('#pFrame'));
        }
        const iframe = modal.querySelector('#pFrame iframe');
        const source = modal.querySelector('#pSource').value;
        const tuned = source === 'cinesrc' || source === 'vidstuck';
        modal.querySelector('.tv-subs').style.display = tuned ? '' : 'none';
        if (!iframe || iframe.dataset.tv || !tuned) return;
        const url = new URL(iframe.dataset.src || iframe.src);
        if (source === 'cinesrc') {
            url.searchParams.set('subtitles', subtitle() === 'Off' ? 'off' : 'auto');
            if (subtitle() === 'Off') url.searchParams.delete('subtitlelang');
            else url.searchParams.set('subtitlelang', subtitle());
        } else {
            // vidstuck already autoplays with sound; autoplay=true in the URL would start it muted.
            url.searchParams.delete('autoplay');
            if (subtitle() === 'Off') url.searchParams.delete('subtitle');
            else url.searchParams.set('subtitle', subtitle());
        }
        // A fresh iframe, so its load guard starts counting from zero.
        const fresh = iframe.cloneNode();
        // Start where this account left off (sync.js).
        fresh.src = fresh.dataset.src = SM.sync ? SM.sync.withResume(url.href, source) : url.href;
        fresh.dataset.n = '0';
        fresh.dataset.tv = '1';
        fresh.dataset.resume = '1';
        fresh.tabIndex = -1;
        // vidstuck refuses to play in any sandboxed frame (it probes document.domain). Without the
        // sandbox it still can't open popups or redirect the app: focus, and with it user
        // activation, never goes inside the frame.
        if (source === 'vidstuck') fresh.removeAttribute('sandbox');
        iframe.replaceWith(fresh);
    }

    new MutationObserver(() => {
        const modal = playerModal();
        if (modal) tunePlayer(modal);
        // YouTube won't play in the TV app: it runs from file://, so YouTube gets no referrer
        // and shows "Video player configuration error". The hosted trailer page embeds it instead.
        const trailer = location.protocol === 'file:' && document.querySelector('#modalRoot .modal-video iframe[src*="youtube"]');
        if (trailer) trailer.src = 'https://jbw9.github.io/movies/trailer.html?v=' + new URL(trailer.src).pathname.split('/').pop();
    }).observe(document.getElementById('modalRoot'), { childList: true, subtree: true });

    // If the player grabs focus anyway (a click, or its own script), take it straight back.
    window.addEventListener('blur', () => setTimeout(() => {
        const el = document.activeElement;
        if (!el || el.tagName !== 'IFRAME') return;
        el.blur();
        window.focus();
        focusEl(el.closest('.frame') || el.parentElement);
    }, 0));

    function setFull(on) {
        const modal = playerModal();
        if (!modal) return;
        modal.classList.toggle('tv-full', on);
        focusEl(modal.querySelector('#pFrame'));
    }

    // Reloads the video where it is: brings back sound a player started muted, and clears
    // popups the player's ads put over it.
    function reloadPlayer() {
        const old = playerModal() && playerModal().querySelector('#pFrame iframe');
        if (!old) return resumePlayer();
        // Without these marks the player is tuned again, with the latest resume point.
        delete old.dataset.tv;
        delete old.dataset.resume;
        old.replaceWith(old.cloneNode());
        osd('');
        ui.toast('Reloading the video', { icon: 'info' });
    }

    // Other players can't be told to pause, so pausing unloads them and resuming reloads at the
    // spot it reported last (sync.js). Only for players that can start at a given second.
    let pausedFrame = null;
    function pausePlayer() {
        const modal = playerModal();
        const frame = modal && modal.querySelector('#pFrame iframe');
        if (!frame) return;
        if (!SM.sync || !SM.sync.canResume(modal.querySelector('#pSource').value)) {
            return ui.toast("This source can't pause from the remote. Try cinesrc.", { icon: 'info' });
        }
        pausedFrame = frame.cloneNode();
        delete pausedFrame.dataset.tv;
        delete pausedFrame.dataset.resume;
        const msg = document.createElement('div');
        msg.className = 'frame-msg tv-paused';
        msg.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg><span>Paused. OK to keep watching.</span>';
        frame.replaceWith(msg);
    }

    function resumePlayer() {
        const modal = playerModal();
        const msg = modal && modal.querySelector('#pFrame .tv-paused');
        if (!msg || !pausedFrame) return;
        msg.replaceWith(pausedFrame);
        pausedFrame = null;
    }

    // Switching source or closing drops a pause; the old player is gone either way.
    SM.on('modal-close', () => { pausedFrame = null; });

    // cinesrc takes play/pause commands, so it pauses in place. It starts itself again a few
    // seconds after a pause it didn't see come from its own controls, so a pause is held until
    // OK is pressed again.
    // cinesrcAt is the position last reported by cinesrcClock, so a skip never starts from the
    // previous video's time.
    let heldPause = null, cinesrcAt = 0, cinesrcClock = null;

    // Big icons over the video so the remote's pauses and skips show they went through.
    const PAUSE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
    const SKIP_ICON = dir => `<svg viewBox="0 0 24 24" fill="currentColor"${dir < 0 ? ' style="transform:scaleX(-1)"' : ''}><path d="M4 6.5v11a.8.8 0 0 0 1.2.7L13 13v4.5a.8.8 0 0 0 1.2.7l8.4-5.5a.8.8 0 0 0 0-1.4l-8.4-5.5A.8.8 0 0 0 13 6.5V11L5.2 5.8A.8.8 0 0 0 4 6.5z"/></svg>`;
    let osdTimer = null;
    function osd(html, ms) {
        const frame = playerModal() && playerModal().querySelector('#pFrame');
        if (!frame) return;
        let el = frame.querySelector('.tv-osd');
        if (!el) {
            el = document.createElement('div');
            el.className = 'tv-osd';
            frame.appendChild(el);
        }
        clearTimeout(osdTimer);
        el.innerHTML = html ? `<div class="tv-osd-badge">${html}</div>` : '';
        // A skip's badge fades back to the pause icon if the video is still paused.
        if (ms) osdTimer = setTimeout(() => {
            const iframe = frame.querySelector('iframe');
            osd(iframe && heldPause === iframe.contentWindow ? PAUSE_ICON : '');
        }, ms);
    }
    const cinesrc = (frame, command, args) => frame.contentWindow.postMessage({ type: 'cinesrc:command', command, args }, '*');
    window.addEventListener('message', e => {
        const frame = document.querySelector('#modalRoot #pFrame iframe');
        if (!frame || e.source !== frame.contentWindow || !e.data) return;
        if (e.data.type === 'cinesrc:timeupdate') {
            cinesrcAt = e.data.currentTime;
            cinesrcClock = e.source;
        }
        if (e.data.type === 'cinesrc:play' && heldPause === frame.contentWindow) cinesrc(frame, 'pause');
    });

    // Left and right on the video skip back and forward 15 seconds (cinesrc only).
    function skip(dir) {
        const modal = playerModal();
        const frame = modal && modal.querySelector('#pFrame iframe');
        if (!frame || modal.querySelector('#pSource').value !== 'cinesrc') return false;
        if (!isFull() && !document.activeElement.matches('.modal-player .frame')) return false;
        if (cinesrcClock !== frame.contentWindow) return true;
        const step = dir === 'right' ? 15 : -15;
        cinesrcAt = Math.max(0, cinesrcAt + step);
        cinesrc(frame, 'seek', [cinesrcAt]);
        osd(`${SKIP_ICON(step)}<span>${step > 0 ? '+' : '−'}15s</span>`, 900);
        return true;
    }

    function togglePause() {
        const modal = playerModal();
        const frame = modal && modal.querySelector('#pFrame iframe');
        if (frame && modal.querySelector('#pSource').value === 'cinesrc') {
            const resume = heldPause === frame.contentWindow;
            heldPause = resume ? null : frame.contentWindow;
            cinesrc(frame, resume ? 'play' : 'pause');
            osd(resume ? '' : PAUSE_ICON);
            return;
        }
        const paused = modal && modal.querySelector('#pFrame .tv-paused');
        if (paused) resumePlayer();
        else pausePlayer();
    }

    // Taps are counted until the remote goes quiet: one pauses, two toggle full screen, three reload.
    let taps = 0, tapTimer = null;
    function okOnVideo() {
        taps++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => {
            const n = taps;
            taps = 0;
            if (n === 1) togglePause();
            else if (n === 2) setFull(!isFull());
            else reloadPlayer();
        }, 450);
    }

    // ---- side menu -----------------------------------------------------------------------

    const rail = document.createElement('nav');
    rail.className = 'tv-rail';
    rail.setAttribute('aria-label', 'Menu');
    const MENU = [
        ['search', '#/search', 'search', 'Search'],
        ['home', '#/', 'home', 'Home'],
        ['film', '#/movies', 'movies', 'Movies'],
        ['tv', '#/tv', 'tv', 'Series'],
        ['bookmark', '#/list', 'list', 'My List'],
        ['goat', '#/goat', 'goat', 'GOAT'],
        ['shuffle', '', 'surprise', 'Surprise me'],
        ['play', '', 'southpark', 'South Park'],
        ['sliders', '#/settings', 'settings', 'Settings'],
    ];
    rail.innerHTML = `<span class="tv-brand"><img src="previews/icon.svg" alt=""></span>` +
        MENU.map(([ic, href, nav, label]) => href
            ? `<a href="${href}" data-nav="${nav}">${nav === 'settings' ? `<span data-avatar>${icon(ic)}</span>` : icon(ic)}<span class="tv-label">${label}</span></a>`
            : `<button type="button" data-tv-action="${nav}">${icon(ic)}<span class="tv-label">${label}</span></button>`).join('');
    rail.querySelector('[data-tv-action="surprise"]').addEventListener('click', () => SM.surprise());
    rail.querySelector('[data-tv-action="southpark"]').addEventListener('click', () => SM.southPark());
    document.body.appendChild(rail);
    if (SM.sync) SM.sync.avatar();

    // The router already highlighted [data-nav] before this menu existed.
    const ROUTE_NAV = { home: 'home', movies: 'movies', movie: 'movies', tv: 'tv', list: 'list', goat: 'goat', settings: 'settings', search: 'search' };
    const nav = ROUTE_NAV[document.body.dataset.route];
    rail.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === nav));

    // ---- on-screen keyboard for search ----------------------------------------------------

    const keys = document.createElement('div');
    keys.className = 'tv-keys';
    keys.innerHTML = `
        <div class="tv-query">${icon('search')}<span id="tvQuery"></span></div>
        <div class="tv-words"></div>
        <div class="tv-next"></div>
        <div class="tv-keygrid">${'abcdefghijklmnopqrstuvwxyz1234567890'.split('').map(c => `<button type="button" data-k="${c}">${c}</button>`).join('')}</div>
        <div class="tv-keyrow">
            <button type="button" data-k=" ">Space</button>
            <button type="button" data-k="del" aria-label="Delete">${icon('left')}</button>
            <button type="button" data-k="clear">Clear</button>
        </div>`;
    document.body.appendChild(keys);

    let query = '', searchTimer = null;
    const showQuery = () => {
        const out = document.getElementById('tvQuery');
        out.textContent = query || 'Search movies, series, people';
        out.classList.toggle('empty', !query);
    };
    const queryFromUrl = () => {
        const m = location.hash.match(/[?&]q=([^&]*)/);
        query = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
        showQuery();
    };
    queryFromUrl();
    window.addEventListener('hashchange', () => { if (location.hash.startsWith('#/search')) queryFromUrl(); });

    // Predict what comes next from the titles matching what's typed so far: the likeliest next
    // letters (focus jumps to the best one, so OK-OK-OK spells it out) and whole-word completions.
    const plain = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
    // TMDB search is poor for one or two letters, so popular titles are mixed in.
    let pool = null;
    const popularPool = () => pool || (pool = Promise.all(
        ['/trending/all/week', '/trending/all/day', '/movie/popular', '/tv/popular', '/movie/top_rated', '/tv/top_rated']
            .flatMap(p => [1, 2].map(page => api.tmdb(p, { page }).catch(() => null)))
    ).then(pages => pages.flatMap(r => (r && r.results) || [])));
    let predictToken = 0;
    async function predict(pressed) {
        const words = keys.querySelector('.tv-words'), next = keys.querySelector('.tv-next');
        const q = plain(query).replace(/^ /, '');
        const token = ++predictToken;
        if (!q.trim()) {
            words.innerHTML = next.innerHTML = '';
            return;
        }
        let titles;
        try {
            const [res, popular] = await Promise.all([api.tmdb('/search/multi', { query: q.trim(), include_adult: 'false' }), popularPool()]);
            const seen = new Set();
            titles = [...(res.results || []), ...popular].filter(r => {
                const id = r.media_type + r.id;
                return !seen.has(id) && seen.add(id);
            });
        } catch (e) {
            return;
        }
        if (token !== predictToken) return;

        const letters = {}, completions = {};
        const last = q.split(' ').pop();
        titles.forEach(r => {
            const title = plain(r.title || r.name || '');
            const weight = Math.log10(2 + (r.popularity || 0));
            // The typed text can continue the whole title or any word inside it.
            const starts = [0, ...[...title.matchAll(/ /g)].map(m => m.index + 1)];
            const from = starts.find(s => title.startsWith(q, s) && title.length > s + q.length);
            if (from !== undefined) {
                const ch = title[from + q.length];
                // A space right after one letter is almost always an initial ("L.A. Law"), rarely what's meant.
                if (ch !== ' ' || last.length > 1) letters[ch] = (letters[ch] || 0) + weight;
            }
            if (last) title.split(' ').forEach(w => {
                if (w.length > 2 && w.length > last.length && w.startsWith(last)) completions[w] = (completions[w] || 0) + weight;
            });
        });
        const top = (scores, n) => Object.keys(scores).sort((a, b) => scores[b] - scores[a]).slice(0, n);
        words.innerHTML = top(completions, 3).map(w => `<button type="button" data-word="${esc(w)}">${esc(w)}</button>`).join('');
        next.innerHTML = top(letters, 6).map(c => `<button type="button" data-k="${esc(c)}">${c === ' ' ? 'Space' : esc(c)}</button>`).join('');

        const cur = document.activeElement;
        if (cur === pressed || !usable(cur)) {
            focusEl(next.querySelector('button') || words.querySelector('button') || keys.querySelector(`.tv-keygrid [data-k="${q.slice(-1)}"]`) || keys.querySelector('.tv-keygrid button'));
        }
    }

    keys.addEventListener('click', e => {
        const b = e.target.closest('[data-k], [data-word]');
        if (!b) return;
        const k = b.dataset.k;
        if (b.dataset.word) query = query.replace(/\S*$/, b.dataset.word + ' ');
        else query = k === 'del' ? query.slice(0, -1) : k === 'clear' ? '' : (query + k).slice(0, 60);
        showQuery();
        predict(b);
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const q = query.trim();
            history.replaceState(history.state, '', '#/search' + (q ? '?q=' + encodeURIComponent(q) : ''));
            SM.route();
        }, 450);
    });

    // ---- full-screen picker instead of native dropdowns -----------------------------------

    let pickerFrom = null;
    function openPicker(select) {
        const title = (select.closest('label') && select.closest('label').querySelector('span')) ||
            (select.closest('.setting') && select.closest('.setting').querySelector('h3'));
        const box = document.createElement('div');
        box.id = 'tvPicker';
        box.innerHTML = `<div class="tv-picker">
                <h3>${esc(title ? title.textContent : select.getAttribute('aria-label') || 'Choose')}</h3>
                <div class="tv-picker-list">${[...select.options].map((o, i) =>
                    `<button type="button" data-i="${i}"${o.selected ? ' class="on"' : ''}>${esc(o.text)}</button>`).join('')}</div>
            </div>`;
        box.addEventListener('click', e => {
            const b = e.target.closest('[data-i]');
            if (!b) return;
            select.selectedIndex = Number(b.dataset.i);
            closePicker();
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        document.body.appendChild(box);
        pickerFrom = select;
        focusEl(box.querySelector('.on') || box.querySelector('button'));
    }

    function closePicker() {
        const box = document.getElementById('tvPicker');
        if (!box) return false;
        box.remove();
        if (pickerFrom && pickerFrom.isConnected) focusEl(pickerFrom);
        return true;
    }

    // ---- spatial navigation ------------------------------------------------------------------

    const FOCUSABLE = 'a[href],button:not([disabled]),select,label.switch,.modal-player .frame';
    // Hover-only extras and links that would leave the app.
    const SKIP = '.card-wl,.card-x,.card-title,.row-link,.row-arrows *,.hero-dots *,.skip,.ep-expand,.links a,.footer *,.swatch-custom,.topbar *,.tabbar *';

    const rectOf = el => el.getBoundingClientRect();
    const centerY = el => { const r = rectOf(el); return r.top + r.height / 2; };
    const inViewport = el => { const r = rectOf(el); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };

    function usable(el) {
        if (!el || el === document.body || !el.isConnected || el.matches(SKIP) || el.closest('.hero-slide:not(.on)')) return false;
        if (el.matches('a[target="_blank"]')) return false;
        const r = rectOf(el);
        return r.width > 0 && r.height > 0;
    }

    // Left-to-right groups; Left/Right past the edge of one moves into its neighbour.
    function zones() {
        const picker = document.getElementById('tvPicker');
        if (picker) return [picker];
        const modal = document.querySelector('#modalRoot .modal');
        if (modal) return [modal];
        return document.body.dataset.route === 'search' ? [rail, keys, view] : [rail, view];
    }

    const candidates = zone => [...zone.querySelectorAll(FOCUSABLE)].filter(usable);

    function pick(from, list, dir) {
        const r = rectOf(from);
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let best = null, bestScore = Infinity;
        for (const el of list) {
            if (el === from) continue;
            const c = rectOf(el);
            const ex = c.left + c.width / 2, ey = c.top + c.height / 2;
            let score;
            if (dir === 'left' || dir === 'right') {
                // Stay on the same line, like moving along a Netflix row.
                if (Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top) <= 0) continue;
                if (dir === 'right' ? ex <= cx + 2 : ex >= cx - 2) continue;
                score = Math.max(0, dir === 'right' ? c.left - r.right : r.left - c.right) + Math.abs(ey - cy);
            } else {
                if (dir === 'down' ? ey <= cy + 2 : ey >= cy - 2) continue;
                score = Math.max(0, dir === 'down' ? c.top - r.bottom : r.top - c.bottom) + Math.abs(ex - cx) * 0.6;
            }
            if (score < bestScore) { bestScore = score; best = el; }
        }
        return best;
    }

    function reveal(el) {
        if (el.closest('#tvPicker, .modal')) return el.scrollIntoView({ block: 'nearest' });
        if (!view.contains(el)) return;
        const row = el.closest('.rail');
        if (row) {
            // Keep the focused card at the start of its row.
            const pad = parseFloat(getComputedStyle(row).paddingLeft) || 0;
            row.scrollBy({ left: rectOf(el).left - rectOf(row).left - pad, behavior: 'smooth' });
        }
        if (el.closest('.hero, .detail-hero')) return window.scrollTo({ top: 0, behavior: 'smooth' });
        const box = rectOf(el.closest('.row') || el);
        if (box.top < 90 || box.bottom > innerHeight - 40) {
            window.scrollBy({ top: box.top - innerHeight * 0.22, behavior: 'smooth' });
        }
    }

    // A class rather than :focus, so the highlight also shows while the window isn't focused.
    let shown = null;
    function mark(el) {
        if (shown) shown.classList.remove('tv-focus');
        shown = el;
        el.classList.add('tv-focus');
        rail.classList.toggle('tv-open', rail.contains(el));
    }

    function focusEl(el) {
        if (!el) return false;
        if (!el.matches('a[href],button,select,[tabindex]')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
        mark(el);
        reveal(el);
        return true;
    }

    const lastIn = new Map(); // zone element -> last focused element in it
    function enterZone(zone, from) {
        const last = lastIn.get(zone);
        if (usable(last) && inViewport(last)) return focusEl(last);
        if (zone === rail) return focusEl(rail.querySelector('.on') || rail.querySelector('a'));
        const fy = from ? centerY(from) : 0;
        const list = candidates(zone).filter(inViewport);
        list.sort((a, b) => Math.abs(centerY(a) - fy) - Math.abs(centerY(b) - fy) || rectOf(a).left - rectOf(b).left);
        return focusEl(list[0] || candidates(zone)[0]);
    }

    function move(dir) {
        const zs = zones();
        const cur = document.activeElement;
        const zi = zs.findIndex(z => z.contains(cur));
        if (zi < 0 || !usable(cur)) return focusDefault(true);
        // Below the video, start at the left of the controls (Source), not the nearest one.
        if (dir === 'down' && cur.matches('.modal-player .frame')) return focusEl(candidates(zs[zi]).find(el => el.closest('.player-bar')));
        if (focusEl(pick(cur, candidates(zs[zi]), dir))) return;
        const step = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
        if (step && zs[zi + step]) enterZone(zs[zi + step], cur);
    }

    // Where focus lands when a page opens: the main Play button, else the first thing on screen.
    function focusDefault(force) {
        const zs = zones();
        if (zs[0] !== rail) return focusEl(candidates(zs[0])[0]);
        if (document.body.dataset.route === 'search') return focusEl(keys.querySelector('.tv-next button') || keys.querySelector('.tv-keygrid button'));
        const primary = view.querySelector('.hero-slide.on [data-play], .detail .actions [data-play], .detail .actions .btn');
        if (usable(primary)) return focusEl(primary);
        const first = candidates(view).filter(inViewport)[0];
        if (first) return focusEl(first);
        if (force) enterZone(rail);
    }

    // Remember the focused card per page, so Back returns to the same spot.
    const memo = {};
    document.addEventListener('focusin', e => {
        mark(e.target);

        const z = zones().find(z => z.contains(e.target));
        if (z) lastIn.set(z, e.target);
        if (view.contains(e.target)) {
            const row = e.target.closest('.row');
            const card = e.target.closest('[data-key]');
            memo[location.hash] = {
                row: row && row.querySelector('h2') ? row.querySelector('h2').textContent : '',
                key: card ? card.dataset.key : '',
                id: e.target.id,
            };
        }
        // Hold the hero on its slide while something in it is focused.
        const hero = e.target.closest && e.target.closest('[data-hero]');
        document.querySelectorAll('[data-hero]').forEach(h => h.dispatchEvent(new Event(h === hero ? 'mouseenter' : 'mouseleave')));
    });

    function restoreFocus() {
        const m = memo[location.hash];
        if (!m) return false;
        let scope = view;
        if (m.row) scope = [...view.querySelectorAll('.row')].find(r => r.querySelector('h2') && r.querySelector('h2').textContent === m.row) || view;
        const el = (m.key && scope.querySelector(`[data-key="${m.key}"] .card-art`)) || (m.id && document.getElementById(m.id));
        return usable(el) && focusEl(el);
    }

    // TV-only cleanup of rendered pages: settings that make no sense on a TV, and links out.
    function patchPage() {
        const hide = el => el && (el.style.display = 'none');
        hide(view.querySelector('[data-toggle="disguise"]') && view.querySelector('[data-toggle="disguise"]').closest('.panel'));
        view.querySelectorAll('.fact .links').forEach(l => hide(l.closest('.fact')));
        view.querySelectorAll('.detail .note').forEach(n => /theatres/i.test(n.textContent) && hide(n));
    }

    let enterContent = false;
    function afterRender() {
        patchPage();
        const cur = document.activeElement;
        const lost = !cur || cur === document.body || !usable(cur);
        if (!lost && !enterContent) return;
        // Pages show skeletons first; wait until there is something to focus.
        if (!candidates(view).some(inViewport) && document.body.dataset.route !== 'search') return;
        enterContent = false;
        restoreFocus() || focusDefault();
    }
    let settle = null;
    new MutationObserver(() => {
        clearTimeout(settle);
        settle = setTimeout(afterRender, 80);
    }).observe(view, { childList: true, subtree: true });

    // ---- remote keys ---------------------------------------------------------------------------

    // Back always heads home: the player or any page goes to the home page, and the home page
    // home goes to the launcher. Pop-ups and dropdowns just close.
    function back() {
        if (closePicker()) return;
        const modal = document.querySelector('#modalRoot .modal');
        if (modal) {
            ui.closeModal();
            if (!modal.classList.contains('modal-player')) return;
        }
        if (document.body.dataset.route !== 'home') location.hash = '#/';
        else if (!modal) exitApp();
    }

    function activate() {
        const el = document.activeElement;
        if (!el || el === document.body) return focusDefault(true);
        if (el.tagName === 'SELECT') return openPicker(el);
        if (el.matches('.modal-player .frame')) return okOnVideo();
        if (rail.contains(el)) enterContent = true;
        el.click();
    }

    const KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 10009: 'back', 27: 'back', 8: 'back' };
    window.addEventListener('keydown', e => {
        const k = KEYS[e.keyCode];
        if (!k) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        // Full screen shows only the video: OK twice or Back leaves it.
        if ((k === 'left' || k === 'right') && skip(k)) return;
        if (isFull() && k !== 'back') return k === 'ok' && okOnVideo();
        if (k === 'back') back();
        else if (k === 'ok') activate();
        else move(k);
    }, true);

    // Links out of the site don't open on the TV.
    document.addEventListener('click', e => {
        if (!e.target.closest('a[target="_blank"]')) return;
        e.preventDefault();
        e.stopPropagation();
        ui.toast("Web links don't open on the TV", { icon: 'info' });
    }, true);

    afterRender();
})(window.SM);
