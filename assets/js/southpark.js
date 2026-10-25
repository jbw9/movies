// South Park mode: plays South Park episodes from the highest rated down, skipping ones already
// seen (marked watched, or started: sync.js keeps a resume point). Next in a player opened this
// way goes to the next highest rated unseen episode rather than the next one in airing order.
// Once every episode has been seen it starts over from the one played longest ago.
(SM => {
    const SHOW = 2190;
    const { ls, ui, library } = SM;

    // Seen before South Park mode could tell: Scott Tenorman Must Die, Make Love, Not Warcraft, Casa Bonita.
    if (!ls.get('sp-seeded')) {
        library.setWatched(['e-153655', 'e-153733', 'e-153693'], true);
        ls.set('sp-seeded', 1);
    }

    async function episodes() {
        const show = await SM.api.tmdb('/tv/' + SHOW);
        const seasons = (show.seasons || []).filter(s => s.season_number > 0);
        const lists = await Promise.all(seasons.map(s => SM.api.tmdb(`/tv/${SHOW}/season/${s.season_number}`).catch(() => null)));
        return lists.flatMap(l => (l && l.episodes) || [])
            .filter(e => e.vote_average > 0 && e.air_date && !SM.inFuture(e.air_date))
            .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count);
    }

    // The episode playing in the South Park player, so Next knows where it is in the ranking.
    let current = null;

    async function southPark(after) {
        try {
            const all = await episodes();
            if (!all.length) throw new Error('No episodes');
            const progress = ls.get('sm-progress', {}) || {};
            const watched = library.watchedSet();
            const started = e => progress[`tv-${SHOW}-s${e.season_number}e${e.episode_number}`];
            const seen = e => watched.has('e-' + e.id) || started(e);
            const from = after ? all.findIndex(e => e.id === after.id) + 1 : 0;
            const next = all.slice(from).find(e => !seen(e)) || all.find(e => !seen(e))
                || all.reduce((a, b) => ((started(b) || {}).at || 0) < ((started(a) || {}).at || 0) ? b : a);
            ui.toast(`South Park S${next.season_number} · E${next.episode_number}: ${next.name} (★ ${next.vote_average.toFixed(1)})`, { icon: 'play' });
            await SM.player.play({ type: 'tv', id: SHOW, title: 'South Park' }, { season: next.season_number, episode: next.episode_number });
            const modal = document.querySelector('#modalRoot .modal-player');
            if (modal) {
                modal.dataset.sp = '1';
                current = next;
            }
        } catch (e) {
            ui.toast("Couldn't load South Park right now", { icon: 'info' });
        }
    }

    SM.southPark = () => southPark();
    document.addEventListener('click', e => {
        if (e.target.closest('[data-menu="southpark"]')) southPark();
        // Capture phase, so this runs before the player's own Next handler.
        const next = e.target.closest('.modal-player[data-sp] #pNext');
        if (next && current) {
            e.stopPropagation();
            next.disabled = true;
            southPark(current);
        }
    }, true);
})(window.SM);
