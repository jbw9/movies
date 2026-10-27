// Rotten Tomatoes score next to the ★ rating on movie and series pages and on their cards. TMDB doesn't
// have it, so it comes from OMDb by IMDb id, which needs a free key (https://www.omdbapi.com/apikey.aspx);
// without one nothing shows. Scores are kept on the device for a week to stay under OMDb's daily limit,
// and cards are only looked up once they scroll into view.
(SM => {
    const KEY = 'f965bdfe';
    if (!KEY) return;
    const CACHE = 'sm-omdb', WEEK = 7 * 864e5;
    const cache = SM.ls.get(CACHE, {}) || {};
    const pending = {};

    // Cached under the IMDb id, or under the card's type:id when the IMDb id has to come from TMDB first.
    function cached(k, load) {
        const hit = cache[k];
        if (hit && Date.now() - hit[1] < WEEK) return Promise.resolve(hit[0]);
        return pending[k] ||= load().then(v => {
            cache[k] = [v, Date.now()];
            SM.ls.set(CACHE, cache);
            return v;
        }).finally(() => delete pending[k]);
    }

    const score = imdb => cached(imdb, () => fetch(`https://www.omdbapi.com/?i=${imdb}&apikey=${KEY}`).then(r => r.json())
        .then(r => ((r.Ratings || []).find(x => x.Source === 'Rotten Tomatoes') || {}).Value || ''));

    const scoreFor = (type, id) => cached(`${type}:${id}`, () => SM.api.tmdb(`/${type}/${id}/external_ids`)
        .then(r => r.imdb_id ? score(r.imdb_id) : ''));

    const tomato = rt => `🍅 ${SM.esc(rt)}`;

    const seen = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target: card }) => {
        if (!isIntersecting) return;
        seen.unobserve(card);
        const [type, id] = card.dataset.key.split(':');
        scoreFor(type, id).then(rt => {
            const badges = card.querySelector('.card-badges');
            if (!rt || !badges) return;
            const html = `<span class="badge rt" title="Rotten Tomatoes">${tomato(rt)}</span>`;
            const rating = badges.querySelector('.rating');
            if (rating) rating.insertAdjacentHTML('afterend', html);
            else badges.insertAdjacentHTML('afterbegin', html);
        }).catch(() => {});
    }), { rootMargin: '200px' });

    const view = document.getElementById('view');
    new MutationObserver(() => {
        view.querySelectorAll('.card:is([data-key^="movie:"], [data-key^="tv:"]):not([data-rt])').forEach(card => {
            card.dataset.rt = '1';
            seen.observe(card);
        });

        // Detail pages render their IMDb link in the facts below; that gives the id.
        const line = view.querySelector('.detail .facts-line:not([data-rt])');
        const imdb = (view.querySelector('a[href*="imdb.com/title/"]')?.href.match(/tt\d+/) || [])[0];
        if (!line || !imdb) return;
        line.dataset.rt = '1';
        score(imdb).then(rt => {
            if (!rt || !line.isConnected) return;
            // Right after the ★ rating's part of the line (parts are split by dots).
            const html = `<span class="dot"></span><span class="rt" title="Rotten Tomatoes">${tomato(rt)}</span>`;
            let next = line.querySelector('.rating');
            while (next && !(next.classList && next.classList.contains('dot'))) next = next.nextSibling;
            if (next) next.insertAdjacentHTML('beforebegin', html);
            else line.insertAdjacentHTML('beforeend', html);
        }).catch(() => {});
    }).observe(view, { childList: true, subtree: true });
})(window.SM);
