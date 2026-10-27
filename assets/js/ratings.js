// IMDb rating and Rotten Tomatoes score next to the ★ rating on movie and series pages, and the IMDb
// rating on each episode. TMDB has neither, so they come from OMDb by IMDb id, which needs a free key
// (https://www.omdbapi.com/apikey.aspx); without one nothing shows. Answers are kept on the device for
// a week to stay under OMDb's daily limit. Rotten Tomatoes doesn't score single episodes.
(SM => {
    const KEY = 'f965bdfe';
    if (!KEY) return;
    const CACHE = 'sm-omdb', WEEK = 7 * 864e5;
    const cache = SM.ls.get(CACHE, {}) || {};
    const pending = {};

    // Query is i=<imdb id>, optionally with &Season=<n>, which lists that season's episodes.
    function omdb(q) {
        const hit = cache[q];
        if (hit && Date.now() - hit[1] < WEEK) return Promise.resolve(hit[0]);
        return pending[q] ||= fetch(`https://www.omdbapi.com/?${q}&apikey=${KEY}`).then(r => r.json()).then(r => {
            const v = q.includes('Season')
                ? Object.fromEntries((r.Episodes || []).map(e => [e.Episode, e.imdbRating]))
                : { imdb: r.imdbRating, rt: ((r.Ratings || []).find(x => x.Source === 'Rotten Tomatoes') || {}).Value };
            cache[q] = [v, Date.now()];
            SM.ls.set(CACHE, cache);
            return v;
        }).finally(() => delete pending[q]);
    }

    const num = v => v && v !== 'N/A' ? v : '';
    const imdbHtml = v => `<span class="imdb" title="IMDb rating"><b>IMDb</b> ${SM.esc(v)}</span>`;

    // Detail pages render their IMDb link in the facts below; that gives the id.
    const view = document.getElementById('view');
    new MutationObserver(() => {
        const imdb = (view.querySelector('.detail a[href*="imdb.com/title/"]')?.href.match(/tt\d+/) || [])[0];
        if (!imdb) return;

        const line = view.querySelector('.detail .facts-line:not([data-rt])');
        if (line) {
            line.dataset.rt = '1';
            omdb('i=' + imdb).then(({ imdb: i, rt }) => {
                const html = [num(i) && imdbHtml(i), num(rt) && `<span class="rt" title="Rotten Tomatoes">🍅 ${SM.esc(rt)}</span>`]
                    .filter(Boolean).map(h => '<span class="dot"></span>' + h).join('');
                if (!html || !line.isConnected) return;
                // Right after the ★ rating's part of the line (parts are split by dots).
                let next = line.querySelector('.rating');
                while (next && !(next.classList && next.classList.contains('dot'))) next = next.nextSibling;
                if (next) next.insertAdjacentHTML('beforebegin', html);
                else line.insertAdjacentHTML('beforeend', html);
            }).catch(() => {});
        }

        view.querySelectorAll('.detail [data-play-ep]').forEach(btn => {
            const sub = btn.parentElement.querySelector('.ep-sub:not([data-rt])');
            if (!sub) return;
            sub.dataset.rt = '1';
            const [, season, episode] = btn.dataset.playEp.split(':');
            omdb(`i=${imdb}&Season=${season}`).then(eps => {
                const v = num(eps[episode]);
                if (!v || !sub.isConnected) return;
                const html = (sub.textContent.trim() ? ' · ' : '') + imdbHtml(v);
                const expand = sub.querySelector('.ep-expand');
                if (expand) expand.insertAdjacentHTML('beforebegin', html);
                else sub.insertAdjacentHTML('beforeend', html);
            }).catch(() => {});
        });
    }).observe(view, { childList: true, subtree: true });
})(window.SM);
