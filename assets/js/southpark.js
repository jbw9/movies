// South Park mode: plays South Park episodes from the highest rated down. Episodes already
// started have a resume point (synced by sync.js), so each press plays the best-rated one not
// started yet. Once every episode has been played it starts over from the one played longest ago.
(SM => {
    const SHOW = 2190;
    const { ls, ui } = SM;

    async function episodes() {
        const show = await SM.api.tmdb('/tv/' + SHOW);
        const seasons = (show.seasons || []).filter(s => s.season_number > 0);
        const lists = await Promise.all(seasons.map(s => SM.api.tmdb(`/tv/${SHOW}/season/${s.season_number}`).catch(() => null)));
        return lists.flatMap(l => (l && l.episodes) || [])
            .filter(e => e.vote_average > 0 && e.air_date && !SM.inFuture(e.air_date))
            .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count);
    }

    async function southPark() {
        try {
            const all = await episodes();
            if (!all.length) throw new Error('No episodes');
            const progress = ls.get('sm-progress', {}) || {};
            const started = e => progress[`tv-${SHOW}-s${e.season_number}e${e.episode_number}`];
            const next = all.find(e => !started(e)) || all.reduce((a, b) => (started(b).at < started(a).at ? b : a));
            ui.toast(`South Park S${next.season_number} · E${next.episode_number}: ${next.name} (★ ${next.vote_average.toFixed(1)})`, { icon: 'play' });
            SM.player.play({ type: 'tv', id: SHOW, title: 'South Park' }, { season: next.season_number, episode: next.episode_number });
        } catch (e) {
            ui.toast("Couldn't load South Park right now", { icon: 'info' });
        }
    }

    SM.southPark = southPark;
    document.addEventListener('click', e => {
        if (e.target.closest('[data-menu="southpark"]')) southPark();
    });
})(window.SM);
