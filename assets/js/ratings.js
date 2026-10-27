// Rotten Tomatoes score next to the ★ rating on movie and series pages, their cards and episodes. TMDB doesn't
// have it; the rt edge function (supabase/functions/rt) does, fetching each title from MDBList once for
// everyone. Scores are also kept on the device for a week, and cards are only asked about once they
// scroll into view, a batch at a time.
(SM => {
    const FN = 'https://jbvkjvdthuzofvmhwctv.supabase.co/functions/v1/rt';
    const KEY = 'sb_publishable_hbxcjbYF5H8py5gGLokxPg_tD9nGsNl';
    const CACHE = 'sm-rt', WEEK = 7 * 864e5;
    const cache = SM.ls.get(CACHE, {}) || {};
    let queue = new Map(), timer;

    // Resolves to the score as a number, or null when Rotten Tomatoes has none.
    function score(key) {
        const hit = cache[key];
        if (hit && Date.now() - hit[1] < WEEK) return Promise.resolve(hit[0]);
        if (!queue.has(key)) {
            let resolve;
            queue.set(key, { promise: new Promise(r => resolve = r), resolve });
        }
        timer ||= setTimeout(flush, 150);
        return queue.get(key).promise;
    }

    async function flush() {
        const batch = queue;
        queue = new Map();
        timer = null;
        const keys = [...batch.keys()], got = {};
        // The function answers up to 100 keys a call.
        for (let i = 0; i < keys.length; i += 100) {
            try {
                Object.assign(got, await fetch(FN, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', apikey: KEY },
                    body: JSON.stringify({ keys: keys.slice(i, i + 100) }),
                }).then(r => r.json()));
            } catch (e) {}
        }
        batch.forEach(({ resolve }, key) => {
            // Keys the function couldn't answer aren't cached, so they're asked about again next time.
            if (key in got) cache[key] = [got[key], Date.now()];
            resolve(got[key] ?? null);
        });
        SM.ls.set(CACHE, cache);
    }

    const tomato = rt => `🍅 ${rt}%`;

    const seen = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target: card }) => {
        if (!isIntersecting) return;
        seen.unobserve(card);
        score(card.dataset.key).then(rt => {
            const badges = card.querySelector('.card-badges');
            if (rt == null || !badges) return;
            const html = `<span class="badge rt" title="Rotten Tomatoes">${tomato(rt)}</span>`;
            const rating = badges.querySelector('.rating');
            if (rating) rating.insertAdjacentHTML('afterend', html);
            else badges.insertAdjacentHTML('afterbegin', html);
        });
    }), { rootMargin: '200px' });

    const view = document.getElementById('view');
    new MutationObserver(() => {
        view.querySelectorAll('.card:is([data-key^="movie:"], [data-key^="tv:"]):not([data-rt])').forEach(card => {
            card.dataset.rt = '1';
            seen.observe(card);
        });

        // Episode rows: the play button says show:season:episode.
        view.querySelectorAll('[data-play-ep]').forEach(btn => {
            const sub = btn.parentElement.querySelector('.ep-sub:not([data-rt])');
            if (!sub) return;
            sub.dataset.rt = '1';
            score('ep:' + btn.dataset.playEp).then(rt => {
                if (rt == null || !sub.isConnected) return;
                const html = (sub.textContent.trim() ? ' · ' : '') + `<span class="rt" title="Rotten Tomatoes">${tomato(rt)}</span>`;
                const expand = sub.querySelector('.ep-expand');
                if (expand) expand.insertAdjacentHTML('beforebegin', html);
                else sub.insertAdjacentHTML('beforeend', html);
            });
        });

        const line = view.querySelector('.detail .facts-line:not([data-rt])');
        const [, type, id] = location.hash.match(/^#\/(movie|tv)\/(\d+)/) || [];
        if (!line || !type) return;
        line.dataset.rt = '1';
        score(`${type}:${id}`).then(rt => {
            if (rt == null || !line.isConnected) return;
            // Right after the ★ rating's part of the line (parts are split by dots).
            const html = `<span class="dot"></span><span class="rt" title="Rotten Tomatoes">${tomato(rt)}</span>`;
            let next = line.querySelector('.rating');
            while (next && !(next.classList && next.classList.contains('dot'))) next = next.nextSibling;
            if (next) next.insertAdjacentHTML('beforebegin', html);
            else line.insertAdjacentHTML('beforeend', html);
        });
    }).observe(view, { childList: true, subtree: true });
})(window.SM);
