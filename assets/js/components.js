(c=>{let{esc:p,icon:m,library:u}=c,a=new Map,h=e=>(e&&a.set(c.keyOf(e.type,e.id),e),e),v=e=>"ep"===e.type?`#/tv/${e.show}/season/${e.season}`:`#/${e.type}/`+e.id,f=e=>e?`<span class="rating">${m("star")}${Number(e).toFixed(1)}</span>`:"",b=e=>"tv"===e?"Series":"Movie",g='<i class="badge-break"></i><span class="badge badge-canceled" title="This show was cancelled">Canceled</span>',$=e=>e?`<span class="badge-new" title="New: S${e.season} · E${e.episode}">New episode</span>`:"",t=(e=8,a)=>Array.from({length:e},()=>`<div class="card skeleton${a?" card-wide":""}"><div class="card-art"></div><div class="sk-line"></div><div class="sk-line short"></div></div>`).join(""),r=(e,a,t,r="")=>`
        <div class="empty">
            <div class="empty-ic">${m(e)}</div>
            <h3>${p(a)}</h3>
            <p>${t}</p>
            ${r}
        </div>`,s=null;function i(e,a=""){o(!0),s=document.activeElement;let t=document.getElementById("modalRoot");t.innerHTML=`<div class="modal-backdrop" data-close></div><div class="modal ${a}" role="dialog" aria-modal="true">${e}</div>`,document.body.classList.add("locked"),requestAnimationFrame(()=>t.classList.add("open"));a=t.querySelector(".modal button, .modal [href], .modal select");return a&&a.focus(),t.querySelector(".modal")}function o(e){let a=document.getElementById("modalRoot");var t;a.innerHTML&&(c.emit("modal-close"),a.classList.remove("open"),document.body.classList.remove("locked"),t=()=>{a.innerHTML=""},e?t():setTimeout(t,180),s)&&s.focus&&s.focus({preventScroll:!0})}c.ui={canceledBadge:g,fitLogo:function(t,r="hero"){var s=t.naturalWidth,i=t.naturalHeight;if(s&&i){var o=window.innerWidth<760,o={hero:o?{area:15e3,maxW:Math.min(300,.8*window.innerWidth),maxH:90,minH:34}:{area:42e3,maxW:500,maxH:140,minH:56},detail:o?{area:14e3,maxW:Math.min(300,.85*window.innerWidth),maxH:90,minH:34}:{area:36e3,maxW:460,maxH:130,minH:50}}[r],r=s/i;let e=Math.sqrt(o.area/r),a=(e=Math.max(o.minH,Math.min(o.maxH,e)))*r;a>o.maxW&&(a=o.maxW,e=a/r),t.style.width=Math.round(a)+"px",t.style.height=Math.round(e)+"px"}},newBadge:$,remember:h,lookup:e=>a.get(e),epItem:(e,a)=>h({type:"ep",id:a.id,show:Number(e.id),title:e.title,season:a.season_number,episode:a.episode_number,name:a.name||"",year:c.year(a.air_date),poster:e.poster,backdrop:a.still_path?c.api.img(a.still_path,"w780"):e.backdrop,rating:a.vote_average||0}),href:v,rating:f,typeLabel:b,card:function(e,a={}){if(!e)return"";h(e);var t=c.keyOf(e.type,e.id),r=u.inList(e.type,e.id),s="movie"===e.type&&u.isWatched("m-"+e.id),i=!a.removeLog&&u.historyFor(e.type,e.id),o=e.date&&c.inFuture(e.date),n=a.sub??("ep"===e.type?`S${e.season} · E${e.episode}`+(e.name?" — "+e.name:""):[e.year,b(e.type)].filter(Boolean).join(" · ")),l="tv"===e.type&&c.tracker?c.tracker.newEpisode(e.id):null,d=a.href||v(e),pe=a.playEp??("ep"===e.type?`${e.show}:${e.season}:${e.episode}`:"");return`
        <article class="card${a.wide?" card-wide":""}" data-key="${t}">
            <a class="card-art" href="${d}"${pe?` data-play-ep="${pe}"`:""} aria-label="${p(e.title)}">
                ${$(l)}
                ${(a.wide?e.backdrop:e.poster)?`<img loading="lazy" src="${p(a.wide?e.backdrop:e.poster)}" alt="" onerror="this.remove()">`:""}
                <span class="card-fallback">${p(e.title)}</span>
                <span class="card-shade"></span>
                <span class="card-badges">
                    ${e.rating&&!o?f(e.rating):""}
                    ${o?`<span class="badge">Soon · ${p(c.fmtDate(e.date,{month:"short",day:"numeric"}))}</span>`:""}
                    ${s?`<span class="badge badge-ok" title="Watched">${m("check")}</span>`:""}
                    ${"tv"===e.type&&c.status?.isCanceled(e.id)?g:""}
                </span>
                <span class="card-play">${m("play")}</span>
                ${a.progress?`<span class="card-progress"><i style="width:${Math.min(100,a.progress)}%"></i></span>`:""}
                ${!a.progress&&i&&i.season?`<span class="card-resume">S${i.season} · E${i.episode}</span>`:""}
            </a>
            <button class="card-wl${r?" on":""}" data-wl="${t}" aria-pressed="${r}" title="${r?"Remove from My List":"Add to My List"}">
                ${m(r?"check":"plus")}
            </button>
            ${a.remove?`<button class="card-x" ${a.removeLog?`data-remove-log="${p(a.removeLog)}"`:`data-remove-history="${t}"`} title="Remove from history">${m("x")}</button>`:""}
            <div class="card-meta">
                <a class="card-title" href="${d}"${pe?` data-play-ep="${pe}"`:""}>${p(e.title)}</a>
                <div class="card-sub">${p(n)}</div>
            </div>
        </article>`},personCard:function(e,a){return`
        <a class="person" href="#/person/${e.id}">
            <span class="person-img">${e.profile_path?`<img loading="lazy" src="${c.api.profile(e.profile_path)}" alt="">`:m("user")}</span>
            <span class="person-name">${p(e.name)}</span>
            ${a?`<span class="person-sub">${p(a)}</span>`:""}
        </a>`},row:function(e,a,t={}){return a&&a.trim()?`
        <section class="row${t.cls?" "+t.cls:""}">
            <div class="row-head">
                <h2>${t.icon?m(t.icon):""}${p(e)}</h2>
                ${t.link?`<a class="row-link" href="${t.link}">See all ${m("right")}</a>`:""}
                <div class="row-arrows">
                    <button class="arrow" data-scroll="-1" aria-label="Scroll left">${m("left")}</button>
                    <button class="arrow" data-scroll="1" aria-label="Scroll right">${m("right")}</button>
                </div>
            </div>
            <div class="rail">${a}</div>
        </section>`:""},skeletonCards:t,skeletonRow:e=>`<section class="row row-skel${e?" row-wide":""}"><div class="row-head"><div class="sk-line sk-title"></div></div><div class="rail">${t(8,e)}</div></section>`,skeletonGrid:(e=18)=>`<div class="grid">${t(e)}</div>`,empty:r,errorState:e=>r("globe","Couldn't load this",p(e||"TMDB didn't answer.")+" Check your connection or try again.",'<button class="btn" data-action="retry">Try again</button>'),toast:function(e,a={}){var t=document.getElementById("toasts");let r=document.createElement("div");r.className="toast",r.innerHTML=`${a.icon?m(a.icon):""}<span>${p(e)}</span>`+(a.action?`<button>${p(a.action.label)}</button>`:""),a.action&&(r.querySelector("button").onclick=()=>{a.action.run(),r.remove()}),t.appendChild(r),requestAnimationFrame(()=>r.classList.add("in")),setTimeout(()=>{r.classList.remove("in"),setTimeout(()=>r.remove(),300)},a.ms||2600)},openModal:i,closeModal:o,trailer:function(e,a){i(`
            <div class="trailer">
                <div class="modal-top"><strong>${p(a||"Trailer")}</strong><button class="icon-btn" data-close aria-label="Close">${m("x")}</button></div>
                <div class="frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(e)}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Trailer"></iframe></div>
            </div>`,"modal-video")},pickTrailer:e=>{e=(e?.results||[]).filter(e=>"YouTube"===e.site);return e.find(e=>"Trailer"===e.type&&e.official&&/official|main/i.test(e.name))||e.find(e=>"Trailer"===e.type&&e.official)||e.find(e=>"Trailer"===e.type)||e.find(e=>"Teaser"===e.type)||null},footer:()=>`
        <footer class="footer">
            <div class="footer-brand"><img src="previews/icon.svg" alt=""> Movies <span>credits to <a href="https://heartivelovestv.pages.dev/" target="_blank" rel="noopener">heartivelovestv.pages.dev</a></span></div>
        </footer>`}})(window.SM);