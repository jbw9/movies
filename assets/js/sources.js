// Which source each title opens on. cinesrc has the fewest ads, so it goes first, but it can't
// play everything: its only server with Succession answers every piece of the video with an
// error, and its player sits through about a minute of retries before trying another one. So
// when cinesrc hasn't loaded the video in 20 seconds, the player moves to the next source.
// Whatever plays is remembered per title, with the cinesrc server that worked, on this device
// and for everyone (supabase/accounts.sql), and opens first next time. A title that moved off
// cinesrc tries it again after a few days, in case it's been fixed.
(SM => {
    const { ls, ui } = SM;
    const CACHE = 'sm-best-source', FIRST = 'cinesrc';
    const WAIT = 20e3, RETRY_FIRST = 3 * 864e5, FRESH = 864e5;
    const best = ls.get(CACHE, {}) || {}; // "tv:76331" -> { src, server, at, checked }
    let playing = null;

    // The TV keeps its own: players there start muted unless they unmute themselves, since the
    // remote never clicks inside them, so what plays best on the web can be silent on the TV.
    const keyOf = info => (info.type === 'Movie' ? 'movie:' : 'tv:') + info.tmdbId
        + (document.documentElement.classList.contains('tv') ? '@tv' : '');

    // Asks the database at most once a day per title, and never waits on it for long.
    async function lookup(k) {
        const b = best[k];
        if (b && Date.now() - b.checked < FRESH) return b;
        try {
            const row = await Promise.race([SM.sync.rpc('best_source', { k }), new Promise((_, no) => setTimeout(no, 1500))]);
            best[k] = row ? { src: row.src, server: row.server, at: Date.parse(row.at), checked: Date.now() } : { ...b, checked: Date.now() };
            ls.set(CACHE, best);
        } catch (e) {}
        return best[k] || null;
    }

    // Saves what plays a title. `force` restarts the wait before cinesrc gets another try.
    function remember(k, src, server, ms, force) {
        const old = best[k], now = Date.now();
        if (!force && old && old.src === src && (old.server || null) === server) return;
        best[k] = { src, server, at: now, checked: now };
        ls.set(CACHE, best);
        SM.sync.rpc('report_source', { k, src, srv: server, ms }).catch(() => {});
    }

    // The source the player opens on, from its list (player.js).
    async function first(list, info) {
        playing = keyOf(info);
        const b = await lookup(playing);
        const src = b && list.find(e => e.name === b.src);
        if (!src || (list[0].name === FIRST && src !== list[0] && Date.now() - b.at > RETRY_FIRST)) return list[0];
        return src;
    }

    // Tells cinesrc to start with the server that worked for this title, skipping the ones that
    // don't have it.
    function withServer(src, source, info) {
        const b = best[keyOf(info)];
        if (source !== FIRST || !b || b.src !== FIRST || !b.server) return src;
        const url = new URL(src);
        url.searchParams.set('prioritize', 'true');
        url.searchParams.set('lastserver', b.server);
        return url.href;
    }

    // ---- watching the player ---------------------------------------------------------------

    let frame = null, timer = null, started = 0, server = null, done = false;
    const picked = () => document.querySelector('#modalRoot #pSource');

    // A new player iframe (opened, switched, reloaded) starts over.
    new MutationObserver(() => {
        const iframe = document.querySelector('#modalRoot #pFrame iframe');
        if (iframe === frame) return;
        frame = iframe;
        clearTimeout(timer);
        started = Date.now();
        server = null;
        done = false;
        if (!iframe || !picked() || picked().value !== FIRST) return;
        timer = setTimeout(function check() {
            const select = picked(), next = select && select.options[(select.selectedIndex + 1) % select.options.length];
            if (frame !== iframe || !iframe.isConnected || !next || next.value === FIRST) return;
            // Chrome holds back video in a tab that isn't showing, so that's no sign cinesrc failed.
            if (document.hidden) return timer = setTimeout(check, WAIT);
            console.log('[sources] cinesrc loaded nothing in 20s, switching to', next.value);
            remember(playing, next.value, null, null, true);
            ui.toast(`cinesrc couldn't load this. Switched to ${next.value}.`, { icon: 'info' });
            document.querySelector('#modalRoot #pNextSource').click();
        }, WAIT);
    }).observe(document.getElementById('modalRoot'), { childList: true, subtree: true });

    // cinesrc says which server it picked and when the video has loaded; other players only
    // report a time once they're playing.
    window.addEventListener('message', e => {
        if (done || !frame || e.source !== frame.contentWindow || !e.data || !playing) return;
        const source = picked() && picked().value, d = e.data;
        if (d.type === 'cinesrc:sourceused') server = d.sourceId;
        if (source === FIRST ? d.type !== 'cinesrc:loadedmetadata' : !SM.sync.findTime(d)) return;
        done = true;
        clearTimeout(timer);
        remember(playing, source, source === FIRST ? server : null, Date.now() - started);
    });

    SM.sources = { first, withServer };
})(window.SM);
