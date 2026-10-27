// Rotten Tomatoes score next to the ★ rating on movie and series pages. TMDB doesn't have it, so it
// comes from OMDb by IMDb id, which needs a free key (https://www.omdbapi.com/apikey.aspx); without
// one nothing shows. Scores are kept on the device for a week to stay under OMDb's daily limit.
(SM => {
    const KEY = '';
    if (!KEY) return;
    const CACHE = 'sm-rt', WEEK = 7 * 864e5;
    const cache = SM.ls.get(CACHE, {}) || {};

    async function score(imdb) {
        const hit = cache[imdb];
        if (hit && Date.now() - hit[1] < WEEK) return hit[0];
        const r = await fetch(`https://www.omdbapi.com/?i=${imdb}&apikey=${KEY}`).then(r => r.json());
        const rt = ((r.Ratings || []).find(x => x.Source === 'Rotten Tomatoes') || {}).Value || '';
        cache[imdb] = [rt, Date.now()];
        SM.ls.set(CACHE, cache);
        return rt;
    }

    // Detail pages render their IMDb link in the facts below; that gives the id.
    const view = document.getElementById('view');
    new MutationObserver(async () => {
        const line = view.querySelector('.detail .facts-line:not([data-rt])');
        const imdb = (view.querySelector('a[href*="imdb.com/title/"]')?.href.match(/tt\d+/) || [])[0];
        if (!line || !imdb) return;
        line.dataset.rt = '1';
        let rt;
        try { rt = await score(imdb); } catch (e) { return; }
        if (!rt || !line.isConnected) return;
        // Right after the ★ rating's part of the line (parts are split by dots).
        const html = `<span class="dot"></span><span class="rt" title="Rotten Tomatoes">🍅 ${SM.esc(rt)}</span>`;
        let next = line.querySelector('.rating');
        while (next && !(next.classList && next.classList.contains('dot'))) next = next.nextSibling;
        if (next) next.insertAdjacentHTML('beforebegin', html);
        else line.insertAdjacentHTML('beforeend', html);
    }).observe(view, { childList: true, subtree: true });
})(window.SM);
