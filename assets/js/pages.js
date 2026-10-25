(M=>{let{esc:T,icon:j,library:H,settings:E,api:A}=M,{tmdb:C,normalize:q}=A,x=M.ui,D=(e,a)=>(e?.results||[]).map(e=>q(e,a)).filter(Boolean),y=e=>Promise.allSettled(e).then(e=>e.map(e=>"fulfilled"===e.status?e.value:null)),_=()=>(new Date).toISOString().slice(0,10);function k(e,a,t){let s=!1,i=async()=>{if(!s&&e.alive()){s=!0;try{for(;e.alive()&&a.isConnected&&a.getBoundingClientRect().top<window.innerHeight+900;)if(!await t()){n.disconnect(),a.remove();break}}finally{s=!1}}},n=new IntersectionObserver(e=>e[0].isIntersecting&&i(),{rootMargin:"900px"});n.observe(a),e.cleanup(()=>n.disconnect())}let c=(...e)=>e.map(e=>`<div class="sk-line" style="width:${e}"></div>`).join(""),a=e=>`<div class="actions">${Array.from({length:e},(e,a)=>`<span class="sk-btn${a?"":" sk-btn-wide"}"></span>`).join("")}</div>`;function v(e){return`
        <div class="detail detail-loading">
            <div class="container detail-hero">
                <div class="detail-poster skeleton"></div>
                <div class="detail-main">
                    <div class="sk-line" style="width:120px;height:11px"></div>
                    <div class="sk-line sk-hero"></div>
                    ${c("55%")}
                    <div class="sk-chips">${'<span class="sk-chip"></span>'.repeat(3)}</div>
                    ${c("92%","85%","60%")}
                    ${a(3)}
                </div>
            </div>
            <div class="container detail-body">
                ${e?`<div class="episodes"><div class="sk-line sk-title"></div>${N(3)}</div>`:""}
                <div class="sk-facts">${'<div class="sk-fact"><div class="sk-line" style="width:40%;height:10px"></div><div class="sk-line" style="width:70%"></div></div>'.repeat(4)}</div>
                ${x.skeletonRow()}
            </div>
        </div>`}let N=e=>Array.from({length:e},()=>'<div class="ep skeleton"><div class="ep-still"></div><div class="ep-body"><div class="sk-line" style="width:45%"></div><div class="sk-line short" style="width:25%"></div><div class="sk-line" style="width:90%"></div></div></div>').join(""),S=()=>`<div class="grid">${x.skeletonCards(12)}</div>`,L={movie:[["trending","Trending"],["popular","Popular"],["top","Top rated"],["new","Newest"],["now","In theatres"],["upcoming","Coming soon"]],tv:[["trending","Trending"],["popular","Popular"],["top","Top rated"],["new","Newest"],["airing","Airing this week"]]},Y=[["en","English"],["ja","Japanese"],["ko","Korean"],["zh","Chinese"],["hi","Hindi"],["es","Spanish"],["fr","French"],["de","German"],["it","Italian"],["pt","Portuguese"],["tr","Turkish"],["th","Thai"],["sv","Swedish"],["da","Danish"]],R={movie:[["short","Under 90 min",0,89],["mid","90–120 min",90,120],["long","2–2½ hours",121,150],["epic","Over 2½ hours",151,0]],tv:[["short","Under 30 min",0,29],["mid","30–60 min",30,60],["long","Over 60 min",61,0]]},F=e=>{e=e?.logos||[];return e.find(e=>"en"===e.iso_639_1)||e.find(e=>!e.iso_639_1)||null},I=e=>(e||[]).find(e=>e.iso_3166_1===M.region)||(e||[]).find(e=>"US"===e.iso_3166_1);function B(e){let a=e?.results?.[M.region]||e?.results?.US;if(!a)return"";var e=[...a.flatrate||[],...a.free||[],...a.ads||[]],t=[...a.rent||[],...a.buy||[]];var s=e=>e.filter((a,e,t)=>t.findIndex(e=>e.provider_id===a.provider_id)===e).slice(0,8).map(e=>`<a href="${T(a.link)}" target="_blank" rel="noopener" title="${T(e.provider_name)}"><img src="${A.logo(e.logo_path)}" alt="${T(e.provider_name)}" loading="lazy"></a>`).join("");return e.length||t.length?`
            <div class="fact fact-wide">
                <dt>Officially available on</dt>
                <dd class="providers-row">
                    ${e.length?`<div><span class="mini">Stream</span><div class="logos">${s(e)}</div></div>`:""}
                    ${t.length?`<div><span class="mini">Rent or buy</span><div class="logos">${s(t)}</div></div>`:""}
                </dd>
            </div>`:""}let P=(e,a)=>a?`<div class="fact"><dt>${e}</dt><dd>${a}</dd></div>`:"";function O(a,e,{eyebrow:t,facts:s,actions:i,extra:n,logo:r,tagline:o,credits:l,warning:d}){var c=(e.genres||[]).map(e=>`<a class="chip" href="#/${"tv"===a.type?"tv":"movies"}?genre=${e.id}">${T(e.name)}</a>`).join("");return`
        <article class="detail">
            <div class="backdrop">${a.backdrop?`<img src="${T(A.backdrop(e.backdrop_path))}" alt="" fetchpriority="high">`:""}</div>
            <div class="container detail-hero">
                <div class="detail-poster">${a.poster?`<img src="${T(A.img(e.poster_path,"w500"))}" alt="${T(a.title)} poster">`:`<span>${T(a.title)}</span>`}</div>
                <div class="detail-main">
                    <p class="eyebrow">${t}</p>
                    ${r?`<h1 class="detail-logo"><img src="${A.img(r.file_path,"w500")}" alt="${T(a.title)}" onload="SM.ui.fitLogo(this, 'detail')"></h1>`:`<h1 class="detail-title">${T(a.title)}</h1>`}
                    ${o?`<p class="tagline">${T(o)}</p>`:""}
                    ${d||""}
                    <div class="facts-line">${s.filter(Boolean).join('<span class="dot"></span>')}</div>
                    ${c?`<div class="chips chips-tight">${c}</div>`:""}
                    <p class="overview">${T(e.overview||"No overview yet.")}</p>
                    <div class="actions">${i}</div>
                    ${n||""}
                    ${l?`<p class="credits-line">${l}</p>`:""}
                </div>
            </div>
        </article>`}let U=e=>{var a=M.keyOf(e.type,e.id),g=H.inGoat(e.type,e.id),e=H.inList(e.type,e.id);return`<button class="btn btn-lg btn-glass${e?" on":""}" data-wl="${a}" aria-pressed="${e}" data-wl-label>${j(e?"check":"plus")}<span>${e?"In My List":"My List"}</span></button><button class="btn btn-lg btn-glass${g?" on":""}" data-goat="${a}" aria-pressed="${g}" title="${g?"Remove from GOAT":"Add to GOAT"}">${j("goat")}<span>${g?"In GOAT":"GOAT"}</span></button>`},G=e=>{e=x.pickTrailer(e);return e?`<button class="btn btn-lg btn-glass" data-trailer="${T(e.key)}" data-trailer-name="${T(e.name)}">${j("trailer")} Trailer</button>`:""},W=(e,a)=>x.row("Cast",(e||[]).slice(0,24).map(e=>x.personCard(e,a(e))).join(""),{cls:"row-people"}),z=(e,a)=>`<a class="link-out" href="${T(e)}" target="_blank" rel="noopener noreferrer">${a} ${j("external")}</a>`,n=e=>{var a,e=M.tracker.day(e);return e?((a=new Date).setHours(0,0,0,0),0===(e=Math.round((e-a)/864e5))?"today":1===e?"tomorrow":-1===e?"yesterday":0<e?`in ${e} days`:-e+" days ago"):""},o=e=>{var a=n(e),e=M.tracker.day(e),t=Math.round((e-(new Date).setHours(0,0,0,0))/864e5);return{name:"today"===a?"Today":"tomorrow"===a?"Tomorrow":t<7?e.toLocaleDateString(void 0,{weekday:"long"}):e.toLocaleDateString(void 0,{weekday:"short",month:"short",day:"numeric"}),sub:"today"===a||"tomorrow"===a?e.toLocaleDateString(void 0,{weekday:"short",month:"short",day:"numeric"}):t<7?e.toLocaleDateString(void 0,{month:"short",day:"numeric"}):a}},r=e=>e.name&&!/^Episode \d+$/i.test(e.name)?` — “${T(e.name)}”`:"";function w(){var e=M.tracker.newList();return x.row("New episodes for you",e.map(({rec:e,ep:a})=>x.card({type:"tv",id:e.id,title:e.title,poster:e.poster,backdrop:a.still?A.img(a.still,"w780"):e.backdrop,year:e.year,rating:e.rating},{wide:!0,href:`#/tv/${e.id}/season/`+a.season,sub:`S${a.season} · E${a.episode} · aired `+n(a.air)})).join(""),{icon:"sparkle",cls:"row-wide",link:"#/list?tab=upcoming"})}function l(e,a){var t,s,i;return"movie"===e.kind?`
            <div class="agenda-item">
                <a class="agenda-link" href="#/movie/${(t=e.movie).id}">
                    <span class="agenda-img">${t.backdrop?`<img loading="lazy" src="${T(t.backdrop)}" alt="">`:j("film")}</span>
                    <span class="agenda-text"><strong>${T(t.title)}</strong><span>Movie release</span></span>
                </a>
                <span class="agenda-when">${T(n(e.date))}</span>
            </div>`:({show:t,ep:s}=e,i=s.still?A.still(s.still):t.backdrop,`
            <div class="agenda-item${a?" is-new":""}">
                <a class="agenda-link" href="#/tv/${t.id}/season/${s.season}">
                    <span class="agenda-img">${i?`<img loading="lazy" src="${T(i)}" alt="">`:j("tv")}</span>
                    <span class="agenda-text"><strong>${T(t.title)}</strong><span>S${s.season} · E${s.episode}${r(s)}</span></span>
                </a>
                ${a?`<button class="btn btn-sm" data-play-ep="${t.id}:${s.season}:${s.episode}">${j("play")} Watch</button>`:`<span class="agenda-when">${T(n(e.date))}</span>`}
            </div>`)}async function h(s,i,e){s.innerHTML=Array.from({length:4},()=>'<div class="agenda-item skeleton"><span class="agenda-img"></span><span class="agenda-text"><span class="sk-line"></span><span class="sk-line short"></span></span></div>').join("");let n=[];try{await M.tracker.refresh(e),n=await M.tracker.upcoming()}catch{}if(i.alive()&&s.isConnected){e=M.tracker.newList();let t="";var r=M.alerts.list();r.length&&(t+=`<section class="agenda-day"><h3>Cancelled <small>shows you follow</small></h3>${r.map(e=>`
            <div class="agenda-item is-canceled">
                <a class="agenda-link" href="#/tv/${e.id}">
                    <span class="agenda-img">${e.backdrop?`<img loading="lazy" src="${T(e.backdrop)}" alt="">`:j("tv")}</span>
                    <span class="agenda-text"><strong>${T(e.title)}</strong><span>Cancelled — won't be renewed for another season</span></span>
                </a>
                <button class="icon-btn" data-dismiss-alert="${e.id}" title="Dismiss" aria-label="Dismiss">${j("x")}</button>
            </div>`).join("")}</section>`),e.length&&(t+=`<section class="agenda-day"><h3>Out now <small>${e.length} unwatched</small></h3>${e.map(({rec:e,ep:a})=>l({kind:"tv",show:e,ep:a},!0)).join("")}</section>`);let a=new Map;n.forEach(e=>{a.has(e.date)||a.set(e.date,[]),a.get(e.date).push(e)}),a.forEach((e,a)=>{a=o(a);t+=`<section class="agenda-day"><h3>${T(a.name)} <small>${T(a.sub)}</small></h3>${e.map(e=>l(e)).join("")}</section>`});r=M.tracker.followed().size;s.innerHTML=t||x.empty("clock","Nothing scheduled yet",r?"None of the series you follow have announced new episodes in the next 90 days.":"Add series to My List and their upcoming episodes will show up here, day by day.",r?"":'<a class="btn" href="#/tv">Browse series</a>'),s.querySelectorAll("[data-dismiss-alert]").forEach(e=>e.addEventListener("click",()=>{M.alerts.dismiss(e.dataset.dismissAlert),h(s,i)})),M.alerts.markSeen()}}async function g(a,e,t){let s=[],i=0;return await Promise.all(Array.from({length:Math.min(e,a.length)},async()=>{for(;i<a.length;){var e=i++;try{s[e]=await t(a[e])}catch{s[e]=null}}})),s}let m=28;function d(e){var a=e.item,t=M.keyOf(a.type,a.id),s=H.inList(a.type,a.id);return`
            <div class="agenda-item cal-item">
                <a class="agenda-link" href="${"tv"===a.type&&e.season?`#/tv/${a.id}/season/`+e.season:x.href(a)}">
                    <span class="agenda-img">${a.backdrop?`<img loading="lazy" src="${T(a.backdrop)}" alt="">`:j("tv"===a.type?"tv":"film")}</span>
                    <span class="agenda-text">
                        <strong>${T(a.title)}</strong>
                        <span><em class="cal-tag cal-${e.tone}">${T(e.tag)}</em>${"tv"===a.type?"Series":"Movie"}${a.rating?" · "+x.rating(a.rating):""}</span>
                    </span>
                </a>
                <button class="cal-wl${s?" on":""}" data-wl="${t}" aria-pressed="${s}" title="${s?"Remove from My List":"Add to My List"}">${j(s?"check":"plus")}</button>
            </div>`}M.pages={goat:function(a,s,e){M.setTitle("GOAT");let t=e.get("f")||"all",r=H.goat().filter(e=>"all"===t||e.type===t);a.innerHTML=`
            <div class="container page">
                <header class="page-head">
                    <div><p class="eyebrow">Greatest of all time</p><h1>GOAT</h1></div>
                    <div class="segmented">${[["all","All"],["movie","Movies"],["tv","Series"]].map(([e,a])=>`<a class="${e===t?"on":""}" href="#/goat${"all"===e?"":"?f="+e}">${a}</a>`).join("")}</div>
                </header>
                ${r.length?`<div class="grid">${r.map(e=>x.card(e)).join("")}</div>`:x.empty("goat","all"===t?"No GOATs yet":`No ${"tv"===t?"series":"movies"} here yet`,`Hit ${j("goat")} GOAT on any movie or series you'd happily watch again.`,'<a class="btn" href="#/">Find something</a>')}
            </div>
            `+x.footer()},home:async function(i,n){M.setTitle(""),i.innerHTML=`<section class="hero hero-loading"><div class="hero-body container"><div class="sk-line sk-hero"></div><div class="sk-line"></div><div class="sk-line short"></div></div></section><div class="container">${x.skeletonRow(!0)}${x.skeletonRow()}${x.skeletonRow()}${x.skeletonRow()}</div>`;var[e,a,t,r,o,l,d,c,p]=await y([C("/trending/all/day"),C("/trending/movie/week"),C("/trending/tv/week"),C("/movie/popular",{region:M.region}),C("/movie/top_rated"),C("/tv/top_rated"),C("/movie/now_playing",{region:M.region}),C("/tv/on_the_air"),A.genres()]);if(n.alive())if(e||a){var h,v,p=p?.all||{},g=D(e).filter(e=>e.backdrop&&e.overview).slice(0,6),m=H.history(),u=H.watchlist(),$=m.slice(0,20).map(e=>{var a="tv"===e.type&&e.season?`S${e.season} · E`+e.episode+(e.episodeName?" — "+e.episodeName:""):"Movie · "+M.timeAgo(e.updatedAt);return x.card({...e,backdrop:e.backdrop||e.still},{wide:!0,sub:a,remove:!0})}).join("");i.innerHTML=`
            ${$.trim()?`<div class="container home-rows home-continue">${x.row("Continue watching",$,{icon:"history",link:"#/list?tab=history",cls:"row-wide"})}</div>`:""}
            ${g=g,h=p,g.length?`
        <section class="hero" data-hero>
            ${g.map((e,a)=>{x.remember(e);var t=M.keyOf(e.type,e.id),s=H.inList(e.type,e.id),i=e.genreIds.slice(0,3).map(e=>h[e]).filter(Boolean);return`
                <div class="hero-slide${0===a?" on":""}" aria-hidden="${0!==a}">
                    <img class="hero-img" src="${T(e.backdrop)}" alt="" ${a?'loading="lazy"':'fetchpriority="high"'}>
                    <div class="hero-body container">
                        <div class="eyebrow"><span class="pill">#${a+1} today</span> ${x.typeLabel(e.type)}${e.year?" · "+e.year:""}</div>
                        <h1 class="hero-title" data-logo-for="${t}">${T(e.title)}</h1>
                        <div class="hero-meta">${x.rating(e.rating)}${i.map(e=>`<span>${T(e)}</span>`).join("")}</div>
                        <p class="hero-overview">${T(e.overview)}</p>
                        <div class="actions">
                            <button class="btn btn-lg" data-play="${t}">${j("play")} Play</button>
                            <a class="btn btn-lg btn-glass" href="${x.href(e)}">${j("info")} More info</a>
                            <button class="btn btn-lg btn-glass btn-icon${s?" on":""}" data-wl="${t}" aria-pressed="${s}" title="${s?"Remove from My List":"Add to My List"}">${j(s?"check":"plus")}</button>
                        </div>
                    </div>
                </div>`}).join("")}
            <div class="hero-dots container">${g.map((e,a)=>`<button class="${0===a?"on":""}" data-slide="${a}" aria-label="Slide ${a+1}"><i></i></button>`).join("")}</div>
        </section>`:""}
            <br><div class="container home-rows">
                <div id="newRow">${w()}</div>
                ${x.row("My List",u.slice(0,20).map(e=>x.card(e)).join(""),{icon:"bookmark",link:"#/list"})}
                ${x.row("Trending today",D(e).map(e=>x.card(e)).join(""),{icon:"sparkle"})}
                <div id="becauseRow">${m[0]?x.skeletonRow():""}</div>
                ${x.row("Trending movies",D(a,"movie").map(e=>x.card(e)).join(""),{link:"#/movies"})}
                ${x.row("Trending series",D(t,"tv").map(e=>x.card(e)).join(""),{link:"#/tv"})}
                ${x.row("New episodes this week",D(c,"tv").map(e=>x.card(e)).join(""),{link:"#/tv?sort=airing"})}
                ${x.row("In theatres",D(d,"movie").map(e=>x.card(e,{sub:[e.year,"In theatres"].join(" · ")})).join(""),{link:"#/movies?sort=now"})}
                ${x.row("Popular movies",D(r,"movie").map(e=>x.card(e)).join(""),{link:"#/movies?sort=popular"})}
                ${x.row("Top rated movies",D(o,"movie").map(e=>x.card(e)).join(""),{link:"#/movies?sort=top"})}
                ${x.row("Top rated series",D(l,"tv").map(e=>x.card(e)).join(""),{link:"#/tv?sort=top"})}
                <div id="newsRow">${x.skeletonRow(!0)}</div>
            </div>
            `+x.footer();{p=i;g=n;let r=p.querySelector("[data-hero]");if(r){let a=[...r.querySelectorAll(".hero-slide")],t=[...r.querySelectorAll("[data-slide]")],s=0,e=!1,i=e=>{s=(e+a.length)%a.length,a.forEach((e,a)=>{e.classList.toggle("on",a===s),e.setAttribute("aria-hidden",a!==s)}),t.forEach((e,a)=>{e.classList.toggle("on",a===s),e.querySelector("i").style.animation="none",e.offsetWidth,e.querySelector("i").style.animation=""})},n=(t.forEach(e=>e.addEventListener("click",()=>i(Number(e.dataset.slide)))),r.addEventListener("mouseenter",()=>{e=!0,r.classList.add("paused")}),r.addEventListener("mouseleave",()=>{e=!1,r.classList.remove("paused")}),setInterval(()=>!e&&!document.hidden&&i(s+1),8e3));g.cleanup(()=>clearInterval(n))}}v=n,i.querySelectorAll("[data-logo-for]").forEach(async a=>{var[e,t]=a.dataset.logoFor.split(":");let s=null;try{s=F(await C(`/${e}/${t}/images`,{language:"",include_image_language:"en,null"}))}catch{}if(s&&v.alive()&&a.isConnected){let e=new Image;e.alt=a.textContent,e.decoding="async",e.onload=()=>{v.alive()&&(x.fitLogo(e,"hero"),a.textContent="",a.appendChild(e),a.classList.add("hero-logo"))},e.src=A.img(s.file_path,"w500")}}),A.news().then(e=>{var a=i.querySelector("#newsRow");a&&n.alive()&&(e=(e.articles||[]).filter(e=>e.title&&"[Removed]"!==e.title&&e.urlToImage&&e.url).sort((e,a)=>new Date(a.publishedAt)-new Date(e.publishedAt)).slice(0,12),a.outerHTML=x.row("News",e.map(e=>`
                <a class="news-tile" href="${T(e.url)}" target="_blank" rel="noopener noreferrer">
                    <span class="news-img"><img loading="lazy" src="${T(e.urlToImage)}" alt="" onerror="this.src='previews/no-episode.png'"></span>
                    <span class="news-src">${T((e.source?.name||"News").split(".")[0])} · ${M.timeAgo(new Date(e.publishedAt).getTime())}</span>
                    <span class="news-tile-title">${T(e.title)}</span>
                </a>`).join(""),{icon:"news",link:"#/news",cls:"row-wide row-news"}))}).catch(()=>i.querySelector("#newsRow")?.remove()),n.cleanup(M.on("tracker",()=>{var e=i.querySelector("#newRow");e&&n.alive()&&(e.innerHTML=w())})),M.tracker.refresh();let s=m[0];s&&C(`/${s.type}/${s.id}/recommendations`).then(e=>{var a,t;n.alive()&&(a=i.querySelector("#becauseRow"),e=D(e,"tv"===s.type?"tv":"movie"),t="Because you watched "+s.title,a)&&(a.outerHTML=e.length?x.row(t,e.map(e=>x.card(e)).join(""),{icon:"sparkle"}):"")}).catch(()=>i.querySelector("#becauseRow")?.remove())}else i.innerHTML=`<div class="container">${x.errorState()}</div>`},browse:async function(p,h,v,e){let g="tv"===v,m=e.get("sort")||"trending",u=e.get("genre")||"",$={from:e.get("from")||"",to:e.get("to")||"",rating:e.get("rating")||"",runtime:e.get("runtime")||"",lang:e.get("lang")||""},y=(e=Object.values($).filter(Boolean).length,!!u||0<e),n=g?"#/tv":"#/movies",a=(M.setTitle(g?"Series":"Movies"),p.innerHTML=`<div class="container page"><header class="page-head"><div><div class="sk-line" style="width:70px;height:11px"></div><div class="sk-line sk-hero" style="width:240px"></div></div></header><div class="sk-chips sk-chips-row">${'<span class="sk-chip"></span>'.repeat(6)}</div>${S()}</div>`,[]);try{a=(await A.genres())[v]}catch{}if(h.alive()){let i=e=>{let a=new URLSearchParams({sort:m,genre:u,...$,...e});[...a.keys()].forEach(e=>(!a.get(e)||"sort"===e&&"trending"===a.get(e))&&a.delete(e));e=a.toString();return n+(e?"?"+e:"")};var w=a.find(e=>String(e.id)===u)?.name;let t=(new Date).getFullYear();var b=Array.from({length:t+2-1920},(e,a)=>String(t+1-a));let s=(e,a,t)=>`<option value="${T(e)}"${String(a)===String(e)?" selected":""}>${T(t)}</option>`;var f=(t,e,a)=>`
            <label class="filter${$[t]?" on":""}"><span>${e}</span>
                <select data-filter="${t}">${s("",$[t],"Any")}${a.map(([e,a])=>s(e,$[t],a)).join("")}</select>
            </label>`;p.innerHTML=`
            <div class="container page">
                <header class="page-head">
                    <div>
                        <p class="eyebrow">${g?"Series":"Movies"}</p>
                        <h1>${T(w||L[v].find(e=>e[0]===m)?.[1]||"Trending")}</h1>
                        <p class="result-count" id="resultCount"></p>
                    </div>
                    <div class="segmented" role="tablist">
                        ${L[v].map(([e,a])=>`<a role="tab" aria-selected="${e===m}" class="${e===m?"on":""}" href="${i({sort:e})}">${a}</a>`).join("")}
                    </div>
                </header>
                <div class="filters" role="group" aria-label="Filters">
                    <label class="filter${u?" on":""}"><span>Genre</span>
                        <select data-filter="genre">${s("",u,"All")}${a.map(e=>s(String(e.id),u,e.name)).join("")}</select>
                    </label>
                    ${f("from","From",b.map(e=>[e,e]))}
                    ${f("to","To",b.map(e=>[e,e]))}
                    ${f("rating","Rating",[["5","5+ ★"],["6","6+ ★"],["7","7+ ★"],["8","8+ ★"]])}
                    ${f("runtime",g?"Episode length":"Runtime",R[v].map(([e,a])=>[e,a]))}
                    ${f("lang","Language",Y)}
                    ${e||u?`<a class="btn btn-ghost btn-sm" href="${i({genre:"",from:"",to:"",rating:"",runtime:"",lang:""})}">${j("x")} Clear filters</a>`:""}
                </div>
                <div class="grid" id="grid">${x.skeletonCards(18)}</div>
                <div class="sentinel" id="sentinel">${S()}</div>
            </div>
            `+x.footer(),p.querySelectorAll("[data-filter]").forEach(s=>s.addEventListener("change",()=>{var e={[s.dataset.filter]:s.value},a="from"===s.dataset.filter?s.value:$.from,t="to"===s.dataset.filter?s.value:$.to;a&&t&&Number(a)>Number(t)&&(e.from=t,e.to=a),location.hash=i(e)}));let r=p.querySelector("#grid"),o=new Set,l=0,d=1,c=!0;w=async()=>{if(l>=d||50<=l)return!1;l++;let e;try{e=await C(...(a=l,s={now:"/movie/now_playing",upcoming:"/movie/upcoming",airing:"/tv/on_the_air"},y||"trending"!==m?!y&&s[m]?[s[m],{page:a,region:M.region}]:(i=(s=g?"first_air_date":"primary_release_date")+".gte",n=s+".lte",t={page:a,with_genres:u,include_adult:"false"},"top"===m?Object.assign(t,{sort_by:"vote_average.desc","vote_count.gte":g?200:500}):"new"===m?Object.assign(t,{sort_by:s+".desc",[n]:_(),"vote_count.gte":15}):"upcoming"===m?Object.assign(t,{sort_by:"popularity.desc",[i]:_()}):"now"===m?Object.assign(t,{sort_by:"popularity.desc",[i]:new Date(Date.now()-432e7).toISOString().slice(0,10),[n]:_()}):"airing"===m?Object.assign(t,{sort_by:"popularity.desc","air_date.gte":_(),"air_date.lte":new Date(Date.now()+6048e5).toISOString().slice(0,10)}):t.sort_by="popularity.desc",$.from&&(s=$.from+"-01-01",t[i]=t[i]&&t[i]>s?t[i]:s),$.to&&(i=$.to+"-12-31",t[n]=t[n]&&t[n]<i?t[n]:i),$.rating&&(t["vote_average.gte"]=$.rating,t["vote_count.gte"]=Math.max(t["vote_count.gte"]||0,50)),(s=R[v].find(e=>e[0]===$.runtime))&&(s[2]&&(t["with_runtime.gte"]=s[2]),s[3])&&(t["with_runtime.lte"]=s[3]),$.lang&&(t.with_original_language=$.lang),["/discover/"+v,t]):[`/trending/${v}/week`,{page:a}]))}catch(e){return c&&(r.outerHTML=x.errorState(e.message)),!1}var a,t,s;if(!h.alive())return!1;d=e.total_pages||1;var i,n=D(e,v).filter(e=>!o.has(e.id)&&(o.add(e.id),!0)).map(e=>x.card(e)).join("");return c?(r.innerHTML=n||x.empty("film","Nothing matches",y?"Try loosening the filters.":"Try another genre or sort."),(i=p.querySelector("#resultCount"))&&y&&e.total_results&&(i.textContent=e.total_results.toLocaleString()+" "+(g?"series":"movies")),c=!1):r.insertAdjacentHTML("beforeend",n),l<d};await w(),k(h,p.querySelector("#sentinel"),w)}},search:async function(a,d,e){let c=(e.get("q")||"").trim(),p=e.get("f")||"all";if(M.setTitle(c?"Search: "+c:"Search"),(e=document.getElementById("searchInput"))&&document.activeElement!==e&&(e.value=c),c){a.innerHTML=`
            <div class="container page">
                <header class="page-head">
                    <div><p class="eyebrow">Results for</p><h1>“${T(c)}”</h1></div>
                    <div class="segmented">${[["all","All"],["movie","Movies"],["tv","Series"],["person","People"]].map(([e,a])=>`<a class="${e===p?"on":""}" href="${e=e,"#/search?"+new URLSearchParams({q:c,..."all"!==e?{f:e}:{}})}">${a}</a>`).join("")}</div>
                </header>
                <div class="grid" id="grid">${x.skeletonCards(12)}</div>
                <div class="sentinel" id="sentinel">${S()}</div>
            </div>`+x.footer();let s=a.querySelector("#grid"),i=0,n=1,r=!0,o=0,l="all"===p?"/search/multi":"/search/"+p;e=async()=>{if(i>=n)return!1;i++;let e;try{e=await C(l,{query:c,page:i,include_adult:"false"})}catch(e){return r&&(s.outerHTML=x.errorState(e.message)),!1}if(!d.alive())return!1;n=e.total_pages||1;var a=(e.results||[]).map(e=>({...e,media_type:e.media_type||p})),t=a.map(e=>"person"===e.media_type?`<div class="grid-person">${x.personCard(e,e.known_for_department)}</div>`:x.card(q(e))).join("");return o+=a.length,r?(s.innerHTML=t||x.empty("search","No matches",`Nothing found for “${T(c)}”. Check the spelling or try a different title.`),r=!1):s.insertAdjacentHTML("beforeend",t),i<n};await e(),k(d,a.querySelector("#sentinel"),e)}else{a.innerHTML=`
                <div class="container page">
                    <header class="page-head"><div><p class="eyebrow">Search</p><h1>Find something to watch</h1></div></header>
                    <form class="search search-page" data-search-page>
                        ${j("search","search-icon")}
                        <input type="search" placeholder="Search movies, series, people" aria-label="Search" autofocus>
                    </form>
                    <h2 class="section-title">Popular right now</h2>
                    <div class="grid" id="grid">${x.skeletonCards(12)}</div>
                </div>`+x.footer();try{var t=await C("/trending/all/week");d.alive()&&(a.querySelector("#grid").innerHTML=D(t).slice(0,18).map(e=>x.card(e)).join(""))}catch(e){a.querySelector("#grid").outerHTML=x.errorState(e.message)}}},movie:async function(t,s,i){t.innerHTML=v(!1);let a;try{a=await C("/movie/"+i,{append_to_response:"credits,videos,recommendations,similar,release_dates,watch/providers,images",include_image_language:"en,null"})}catch(e){return void(s.alive()&&(t.innerHTML=`<div class="container">${x.errorState(e.message)}</div>`))}if(s.alive()){var n=x.remember(q(a,"movie")),r=(M.setTitle(""+n.title+(n.year?` (${n.year})`:"")),M.keyOf("movie",i)),o=I(a.release_dates?.results),l=(o?.release_dates||[]).map(e=>e.certification).find(Boolean),d=!M.inFuture(a.release_date);let e=(o?.release_dates||[]).some(e=>4<=e.type&&!M.inFuture(e.release_date));e=e||n.year&&3<=(new Date).getFullYear()-Number(n.year);var o=H.isWatched("m-"+i),c=(a.credits?.crew||[]).filter(e=>"Director"===e.job),p=(a.credits?.crew||[]).filter(e=>["Screenplay","Writer"].includes(e.job)).slice(0,3),h=e=>`<a href="#/person/${e.id}">${T(e.name)}</a>`,r=`
            ${d?`<button class="btn btn-lg" data-play="${r}">${j("play")} ${H.historyFor("movie",i)?"Play again":"Play"}</button>`:`<span class="btn btn-lg btn-disabled">${j("clock")} ${T(M.fmtDate(a.release_date))}</span>`}
            ${U(n)}
            ${G(a.videos)}
            `+(d?`<button class="btn btn-lg btn-glass btn-icon${o?" on":""}" data-watch-movie="${i}" title="${o?"Watched — click to unmark":"Mark as watched"}" aria-pressed="${o}">${j(o?"check":"eye")}</button>`:""),o=a.belongs_to_collection;t.innerHTML=`
            ${O(n,a,{eyebrow:"Movie"+(l?` · <span class="cert">${T(l)}</span>`:""),logo:F(a.images),tagline:a.tagline,facts:[n.year,M.runtime(a.runtime),a.runtime?`<span class="muted">${M.endsAt(a.runtime)}</span>`:"",n.rating?`${x.rating(n.rating)} <span class="muted">${a.vote_count.toLocaleString()} votes</span>`:""],actions:r,extra:d&&!e?`<p class="note">${j("film")} Still in theatres — streams might be cam or low quality.</p>`:"",credits:[c.length?"Directed by "+c.map(h).join(", "):"",p.length?"Written by "+p.map(h).join(", "):""].filter(Boolean).join(" · ")})}
            <div class="container detail-body">
                <dl class="facts-grid">
                    ${B(a["watch/providers"])}
                    ${P("Status",T(a.status))}
                    ${P("Release date",T(M.fmtDate(a.release_date,{month:"long",day:"numeric",year:"numeric"})))}
                    ${P("Original language",T(M.langName(a.original_language)))}
                    ${P("Budget",M.money(a.budget))}
                    ${P("Box office",M.money(a.revenue))}
                    ${P("Studio",T((a.production_companies||[]).slice(0,2).map(e=>e.name).join(", ")))}
                    <div class="fact"><dt>Links</dt><dd class="links">
                        ${a.imdb_id?z("https://www.imdb.com/title/"+a.imdb_id,"IMDb"):""}
                        ${z("https://www.themoviedb.org/movie/"+i,"TMDB")}
                        ${a.imdb_id?`<a class="link-out" href="torrents/?id=${T(a.imdb_id)}" target="_blank" rel="noopener noreferrer">Torrents ${j("magnet")}</a>`:""}
                        ${a.homepage?z(a.homepage,"Website"):""}
                    </dd></div>
                </dl>
                ${W(a.credits?.cast,e=>e.character)}
                <div id="collection">${a.belongs_to_collection?x.skeletonRow():""}</div>
                ${x.row("More like this",D(a.recommendations,"movie").map(e=>x.card(e)).join("")||D(a.similar,"movie").map(e=>x.card(e)).join(""),{icon:"sparkle"})}
            </div>
            `+x.footer(),o&&C("/collection/"+o.id).then(e=>{var a;s.alive()&&((a=(e.parts||[]).map(e=>q(e,"movie")).sort((e,a)=>(e.date||"9999").localeCompare(a.date||"9999"))).length<2?t.querySelector("#collection").innerHTML="":t.querySelector("#collection").innerHTML=x.row(e.name,a.map(e=>x.card(e,{sub:e.id===Number(i)?e.year+" · You're here":e.year||"TBA"})).join(""),{icon:"layers"}))}).catch(()=>{var e=t.querySelector("#collection");e&&(e.innerHTML="")})}},tv:async function(u,$,y,e){u.innerHTML=v(!0);let w;try{w=await C("/tv/"+y,{append_to_response:"aggregate_credits,videos,recommendations,similar,content_ratings,watch/providers,external_ids,images",include_image_language:"en,null"})}catch(e){return void($.alive()&&(u.innerHTML=`<div class="container">${x.errorState(e.message)}</div>`))}if($.alive()){var b=x.remember(q(w,"tv")),f=(M.status.remember(y,w.status),M.setTitle(""+b.title+(b.year?` (${b.year})`:"")),M.keyOf("tv",y)),_=I(w.content_ratings?.results)?.rating;let o=(w.seasons||[]).filter(e=>0<e.season_number&&(!E.bool("hideUnreleased")||!M.inFuture(e.air_date)));var k=H.historyFor("tv",y),S="Ended"===w.status&&M.year(w.last_air_date)!==b.year?b.year+"–"+M.year(w.last_air_date):b.year,L=w.next_episode_to_air;let l=w.external_ids?.imdb_id,a=Number(e)||k?.season||o[0]?.season_number||1,s=e=>e?.season?`Continue S${e.season} · E`+e.episode:"Play S1 · E1";k=s(k);u.innerHTML=`
            ${O(b,w,{eyebrow:"Series"+(_?` · <span class="cert">${T(_)}</span>`:"")+(w.networks?.[0]?" · "+T(w.networks[0].name):""),warning:"Canceled"===w.status?`<div class="cancel-warning" role="note">${j("info")}<span>This show was cancelled and will not be renewed for another season.</span></div>`:"",logo:F(w.images),tagline:w.tagline,facts:[S,w.number_of_seasons+" season"+(1===w.number_of_seasons?"":"s"),w.number_of_episodes+" episodes",b.rating?x.rating(b.rating):"","Returning Series"===w.status?'<span class="tag tag-live">Returning</span>':w.status?`<span class="muted">${T(w.status)}</span>`:""],actions:`
                    ${o.length?`<button class="btn btn-lg" id="playMain" data-play="${f}">${j("play")} <span>${k}</span></button>`:`<span class="btn btn-lg btn-disabled">${j("clock")} Not out yet</span>`}
                    ${U(b)}
                    `+G(w.videos),extra:'<div class="progress-wrap" id="showProgress"></div>'+(L?`<p class="note">${j("clock")} Next: S${L.season_number} · E${L.episode_number}${L.name&&!/^Episode \d+$/.test(L.name)?` “${T(L.name)}”`:""} on ${T(M.fmtDate(L.air_date,{weekday:"short",month:"short",day:"numeric"}))}</p>`:""),credits:(w.created_by||[]).length?"Created by "+w.created_by.map(e=>`<a href="#/person/${e.id}">${T(e.name)}</a>`).join(", "):""})}
            <div class="container detail-body">
                <section class="episodes" id="episodes">
                    <div class="episodes-head">
                        <h2>Episodes</h2>
                        ${o.length?`<select class="season-select" id="seasonSelect" aria-label="Season">
                            ${o.map(e=>`<option value="${e.season_number}"${e.season_number===a?" selected":""}>Season ${e.season_number}${e.episode_count?` (${e.episode_count} episodes)`:""}</option>`).join("")}
                        </select>`:""}
                        <span class="grow"></span>
                        <button class="btn btn-ghost btn-sm" id="markSeason">${j("check")} <span>Mark season watched</span></button>
                    </div>
                    <div class="ep-list" id="epList"></div>
                </section>
                <dl class="facts-grid">
                    ${B(w["watch/providers"])}
                    ${P("First aired",T(M.fmtDate(w.first_air_date,{month:"long",day:"numeric",year:"numeric"})))}
                    ${P("Last aired",T(M.fmtDate(w.last_air_date,{month:"long",day:"numeric",year:"numeric"})))}
                    ${P("Network",(w.networks||[]).map(e=>e.logo_path?`<img class="net-logo" src="${A.logo(e.logo_path)}" alt="${T(e.name)}" title="${T(e.name)}">`:T(e.name)).join(" "))}
                    ${P("Original language",T(M.langName(w.original_language)))}
                    ${P("Episode length",T(M.runtime(w.episode_run_time?.[0])))}
                    <div class="fact"><dt>Links</dt><dd class="links">
                        ${l?z("https://www.imdb.com/title/"+l,"IMDb"):""}
                        ${z("https://www.themoviedb.org/tv/"+y,"TMDB")}
                        ${w.homepage?z(w.homepage,"Website"):""}
                    </dd></div>
                </dl>
                ${W(w.aggregate_credits?.cast,e=>""+(e.roles?.[0]?.character||"")+(e.total_episode_count?` · ${e.total_episode_count} ep`:""))}
                ${x.row("More like this",D(w.recommendations,"tv").map(e=>x.card(e)).join("")||D(w.similar,"tv").map(e=>x.card(e)).join(""),{icon:"sparkle"})}
            </div>
            `+x.footer();let i=u.querySelector("#epList"),t=u.querySelector("#markSeason"),n=[],r=a,d=async()=>{var s,i,n=u.querySelector("#showProgress");if(n){let a=H.watchedSet();let e=0,t=0;for(s of o.filter(e=>0<e.season_number))try{var r=((await C(`/tv/${y}/season/`+s.season_number)).episodes||[]).filter(e=>!M.inFuture(e.air_date));e+=r.length,t+=r.filter(e=>a.has("e-"+e.id)).length}catch{}$.alive()&&e&&t?(i=Math.round(t/e*100),n.innerHTML=`<div class="progress"><i style="width:${i}%"></i></div><span>${t} of ${e} episodes watched</span>`):n.innerHTML=""}},c=null,p=e=>{var a=M.inFuture(e.air_date),t=H.isWatched("e-"+e.id),s=E.bool("hideSpoilers")&&!t,i=H.historyFor("tv",y),i=i&&i.season===e.season_number&&i.episode===e.episode_number,n=!(!e.overview||!e.overview.trim()),r=c===e.id;return`
            <div class="ep${t?" watched":""}${a?" future":""}${i?" last":""}${r?" open":""}" data-ep-id="${e.id}">
                <button class="ep-still" ${a?"disabled":`data-play-ep="${y}:${e.season_number}:${e.episode_number}"`} aria-label="Play episode ${e.episode_number}">
                    ${e.still_path?`<img loading="lazy" src="${A.still(e.still_path)}" alt=""${s?' class="blur"':""}>`:`<span class="ep-noimg">${j("tv")}</span>`}
                    ${a?`<span class="ep-soon">${T(M.fmtDate(e.air_date)||"TBA")}</span>`:`<span class="card-play">${j("play")}</span>`}
                    ${e.runtime?`<span class="ep-time">${M.runtime(e.runtime)}</span>`:""}
                    ${i?'<span class="ep-last">Last played</span>':""}
                </button>
                <div class="ep-body">
                    <div class="ep-head">
                        <span class="ep-num">${e.episode_number}</span>
                        <h3>${T(e.name)}</h3>
                        ${M.isRecent(e.air_date)?'<span class="tag tag-new">New</span>':""}
                    </div>
                    <div class="ep-sub">${[M.fmtDate(e.air_date),e.vote_average?x.rating(e.vote_average):""].filter(Boolean).join(" · ")}${n?`<button class="ep-expand" data-ep-expand="${e.id}" aria-expanded="${r}" aria-controls="epmore-${e.id}" aria-label="${r?"Hide":"Show"} description">${j("down")}</button>`:""}</div>
                    <p class="ep-overview${s?" spoiler":""}" ${s?'title="Hidden until watched — click to reveal" tabindex="0"':""}>${T(e.overview||"No description yet.")}</p>
                </div>
                ${a?"":`<div class="ep-actions">
                    <button class="ep-check${t?" on":""}" data-ep-watch="${e.id}" aria-pressed="${t}" title="${t?"Watched — click to unmark":"Mark as watched"}">${j("check")}</button>
                    ${l?`<a class="ep-tor" href="torrents/?id=${T(l)}&season=${e.season_number}&episode=${e.episode_number}" target="_blank" rel="noopener noreferrer" title="View torrents for S${e.season_number} E${e.episode_number} in new tab" aria-label="Torrents for episode ${e.episode_number}">${j("magnet")}</a>`:""}
                </div>`}
                ${n?`<div class="ep-more" id="epmore-${e.id}"><div><p class="${s?"spoiler":""}" ${s?'title="Hidden until watched — tap to reveal"':""}>${T(e.overview)}</p></div></div>`:""}
            </div>`},h=()=>{var e=n.filter(e=>!M.inFuture(e.air_date)),a=e.length&&e.every(e=>H.isWatched("e-"+e.id));t.querySelector("span").textContent=a?"Unmark season":"Mark season watched",t.classList.toggle("on",!!a),t.hidden=!e.length},v=async e=>{r=e;var a=u.querySelector("#seasonSelect");a&&(a.value=String(e)),i.innerHTML=N(4);try{let a=await C(`/tv/${y}/season/`+e);$.alive()&&r===e&&(n=(a.episodes||[]).filter(e=>!E.bool("hideUnreleased")||!M.inFuture(e.air_date)||e===a.episodes.find(e=>M.inFuture(e.air_date))),i.innerHTML=n.map(p).join("")||x.empty("tv","No episodes yet","Check back once this season starts airing."),h())}catch(e){i.innerHTML=x.errorState(e.message)}},g=(u.querySelector("#seasonSelect")?.addEventListener("change",e=>{e=Number(e.target.value);history.replaceState(history.state,"",`#/tv/${y}/season/`+e),v(e)}),t.addEventListener("click",()=>{var e=n.filter(e=>!M.inFuture(e.air_date)),a=e.every(e=>H.isWatched("e-"+e.id));H.setWatched(e.map(e=>"e-"+e.id),!a)}),window.matchMedia("(max-width: 760px)")),m=(e,a)=>{e.classList.toggle("open",a);e=e.querySelector(".ep-expand");e&&(e.setAttribute("aria-expanded",a),e.setAttribute("aria-label",a?"Hide description":"Show description"))};i.addEventListener("click",e=>{var a,t=e.target.closest(".spoiler");t?t.classList.remove("spoiler"):g.matches&&!e.target.closest(".ep-still, .ep-check, .ep-tor")&&(t=e.target.closest(".ep"))&&t.querySelector(".ep-more")&&(e=Number(t.dataset.epId),a=c!==e,i.querySelectorAll(".ep.open").forEach(e=>m(e,!1)),c=a?e:null,a)&&m(t,!0)});_=M.on("library",e=>{if($.alive())if("history"===e.kind){let a=H.historyFor("tv",y);var t=u.querySelector("#playMain span");t&&(t.textContent=s(a)),void(a?.season&&a.season!==r&&o.some(e=>e.season_number===a.season)?(history.replaceState(history.state,"",`#/tv/${y}/season/`+a.season),v(a.season)):i.innerHTML=n.map(p).join(""))}else"watched"===e.kind&&(i.innerHTML=n.map(p).join(""),h(),d())});$.cleanup(_),await v(a),e&&u.querySelector("#episodes")?.scrollIntoView({block:"start"}),d()}},person:async function(a,s,n,r){a.innerHTML=`
        <div class="container page person-page">
            <header class="person-head">
                <div class="person-photo skeleton"></div>
                <div>${c("90px","")}<div class="sk-line sk-hero"></div>${c("50%","95%","92%","88%","60%")}</div>
            </header>
            ${x.skeletonRow()}
        </div>`;let o;try{o=await C("/person/"+n,{append_to_response:"combined_credits,external_ids"})}catch(e){return void(s.alive()&&(a.innerHTML=`<div class="container">${x.errorState(e.message)}</div>`))}if(s.alive()){M.setTitle(o.name);let t=r.get("f")||"all";s=[...o.combined_credits?.cast||[],...o.combined_credits?.crew||[]];let i=new Map;s.forEach(e=>{var a,t=e.media_type+e.id,s=e.character||e.job||"";i.has(t)?(a=i.get(t),s&&!a.roles.includes(s)&&a.roles.push(s)):i.set(t,{raw:e,roles:s?[s]:[]})});var r=[...i.values()].filter(e=>!("tv"===e.raw.media_type&&/^(Self|Himself|Herself|Themselves)/i.test(e.roles[0]||"")&&(e.raw.genre_ids||[]).some(e=>[10763,10767,10764].includes(e)))),s=[...r].sort((e,a)=>(a.raw.vote_count||0)-(e.raw.vote_count||0)).slice(0,16),r=r.filter(e=>"all"===t||e.raw.media_type===t).sort((e,a)=>(a.raw.release_date||a.raw.first_air_date||"0").localeCompare(e.raw.release_date||e.raw.first_air_date||"0")),l=o.birthday?Math.floor(((o.deathday?new Date(o.deathday):new Date)-new Date(o.birthday))/315576e5):null,d=(o.biography||"").split(/\n+/).filter(Boolean);a.innerHTML=`
            <div class="container page person-page">
                <header class="person-head">
                    <div class="person-photo">${o.profile_path?`<img src="${A.img(o.profile_path,"h632")}" alt="">`:j("user")}</div>
                    <div>
                        <p class="eyebrow">${T(o.known_for_department||"Person")}</p>
                        <h1>${T(o.name)}</h1>
                        <div class="facts-line">
                            ${[o.birthday?"Born "+T(M.fmtDate(o.birthday,{month:"long",day:"numeric",year:"numeric"}))+(null===l||o.deathday?"":` (${l})`):"",o.deathday?`Died ${T(M.fmtDate(o.deathday,{month:"long",day:"numeric",year:"numeric"}))} (${l})`:"",T(o.place_of_birth||"")].filter(Boolean).join('<span class="dot"></span>')}
                        </div>
                        ${d.length?`<div class="bio clamp" id="bio">${d.map(e=>`<p>${T(e)}</p>`).join("")}</div>`+(500<d.join(" ").length?`<button class="btn btn-ghost btn-sm" id="bioMore">Read more ${j("down")}</button>`:""):""}
                        <div class="links">
                            ${o.imdb_id?z("https://www.imdb.com/name/"+o.imdb_id,"IMDb"):""}
                            ${o.external_ids?.instagram_id?z("https://instagram.com/"+o.external_ids.instagram_id,"Instagram"):""}
                            ${z("https://www.themoviedb.org/person/"+n,"TMDB")}
                        </div>
                    </div>
                </header>
                ${x.row("Known for",s.map(e=>x.card(q(e.raw),{sub:e.roles[0]||x.typeLabel(e.raw.media_type)})).join(""))}
                <div class="page-head page-head-sm">
                    <h2>All credits <span class="count">${r.length}</span></h2>
                    <div class="segmented">${[["all","All"],["movie","Movies"],["tv","Series"]].map(([e,a])=>`<a class="${e===t?"on":""}" href="#/person/${n}${"all"===e?"":"?f="+e}">${a}</a>`).join("")}</div>
                </div>
                <div class="grid">${r.slice(0,120).map(e=>x.card(q(e.raw),{sub:[M.year(e.raw.release_date||e.raw.first_air_date)||"TBA",e.roles.slice(0,2).join(", ")].filter(Boolean).join(" · ")})).join("")}</div>
            </div>
            `+x.footer();let e=a.querySelector("#bioMore");e&&e.addEventListener("click",()=>{a.querySelector("#bio").classList.toggle("clamp"),e.remove()})}},list:function(r,o,e){M.setTitle("My List");let l=e.get("tab")||"all",d=e.get("sort")||"added",c="1"===e.get("hide"),p=e=>{e=new URLSearchParams({tab:l,sort:d,hide:c?"1":"",...e});return"1"!==e.get("hide")&&e.delete("hide"),"#/list?"+e.toString()},a=()=>{if(o.alive()){let e,a;a="upcoming"===l?(e=[],'<div class="agenda" id="agenda"></div>'):"history"===l?(e=H.history()).length?`<div class="grid grid-wide">${e.map(e=>x.card({...e,backdrop:e.backdrop||e.still},{wide:!0,remove:!0,sub:("tv"===e.type&&e.season?`S${e.season} · E${e.episode} · `:"Movie · ")+M.timeAgo(e.updatedAt)})).join("")}</div>`:x.empty("history","Nothing watched yet","Anything you play shows up here so you can jump back in.",'<a class="btn" href="#/">Find something</a>'):(e=H.watchlist().filter(e=>"all"===l||e.type===l),n={added:(e,a)=>(a.addedAt||0)-(e.addedAt||0),title:(e,a)=>e.title.localeCompare(a.title),rating:(e,a)=>(a.rating||0)-(e.rating||0),year:(e,a)=>String(a.year).localeCompare(String(e.year))},(e=c?e.filter(e=>!("movie"===e.type&&H.isWatched("m-"+e.id))):e).sort(n[d]||n.added),e.length?`<div class="grid">${e.map(e=>x.card(e)).join("")}</div>`:x.empty("bookmark","all"===l?"Your list is empty":`No ${"tv"===l?"series":"movies"} saved`,`Hit the ${j("plus")} on any poster to save it for later.`,'<a class="btn" href="#/">Browse trending</a>'));let t={all:H.watchlist().length,movie:H.watchlist().filter(e=>"movie"===e.type).length,tv:H.watchlist().filter(e=>"tv"===e.type).length,history:H.history().length,upcoming:M.tracker.newList().length},s=(r.innerHTML=`
                <div class="container page">
                    <header class="page-head">
                        <div><p class="eyebrow">Your library</p><h1>My List</h1></div>
                        <div class="segmented">
                            ${[["all","All"],["movie","Movies"],["tv","Series"],["upcoming","Upcoming"],["history","History"]].map(([e,a])=>`<a class="${e===l?"on":""}" href="#/list?tab=${e}">${a} ${"upcoming"===e?t[e]?`<span class="count count-new" title="New episodes">${t[e]} new</span>`:"":`<span class="count">${t[e]}</span>`}</a>`).join("")}
                        </div>
                    </header>
                    <div class="toolbar">
                        ${"upcoming"===l?`<span class="muted">Following ${M.tracker.followed().size} series from My List and your history</span><button class="btn btn-ghost btn-sm" data-action="refresh-upcoming">${j("history")} Refresh</button>`:"history"===l?e.length?`<button class="btn btn-ghost btn-sm" data-action="clear-history">${j("trash")} Clear history</button>`:"":`<label class="select">Sort
                                    <select data-sort>
                                        ${[["added","Recently added"],["title","Title A–Z"],["rating","Rating"],["year","Release year"]].map(([e,a])=>`<option value="${e}"${e===d?" selected":""}>${a}</option>`).join("")}
                                    </select>
                               </label>
                               <label class="switch"><input type="checkbox" data-hide${c?" checked":""}><span></span>Hide watched movies</label>`}
                        <span class="grow"></span>
                        <a class="btn btn-ghost btn-sm" href="#/settings#data">${j("download")} Back up</a>
                    </div>
                    ${a}
                </div>
                `+x.footer(),r.querySelector("[data-sort]")),i=(s&&s.addEventListener("change",()=>location.hash=p({sort:s.value})),r.querySelector("[data-hide]"));i&&i.addEventListener("change",()=>location.hash=p({hide:i.checked?"1":"0"}));var n=r.querySelector("#agenda"),n=(n&&h(n,o),r.querySelector('[data-action="refresh-upcoming"]')?.addEventListener("click",()=>h(r.querySelector("#agenda"),o,!0)),r.querySelector('[data-action="clear-history"]'));n&&n.addEventListener("click",()=>{let e=H.history();H.clear("history"),x.toast("History cleared",{icon:"trash",action:{label:"Undo",run:()=>{M.ls.set("sm-history",e),M.emit("library",{kind:"history"})}}})})}};a(),o.cleanup(M.on("library",()=>setTimeout(a,0)))},news:async function(t,s){M.setTitle("News"),t.innerHTML=`<div class="container page"><header class="page-head"><div><p class="eyebrow">Headlines</p><h1>News</h1></div></header>${`
        <div class="news-lead skeleton"><div class="news-lead-img"></div><div>${c("70px","90%","75%","95%","40%")}</div></div>
        <div class="news-grid">${Array.from({length:6},()=>'<div class="news-card skeleton"><span class="news-img"></span><div class="sk-line" style="width:40%;height:10px"></div><div class="sk-line"></div><div class="sk-line short"></div></div>').join("")}</div>`}</div>`;let e;try{e=await A.news()}catch(e){return void(s.alive()&&(t.innerHTML=`<div class="container">${x.errorState("The news feed didn't load.")}</div>`))}if(s.alive()){s=(e.articles||[]).filter(e=>e.title&&"[Removed]"!==e.title&&e.urlToImage).sort((e,a)=>new Date(a.publishedAt)-new Date(e.publishedAt));let a=e=>(e.source?.name||"News").split(".")[0];var[s,...i]=s;t.innerHTML=`
            <div class="container page">
                <header class="page-head"><div><p class="eyebrow">Headlines</p><h1>News</h1></div></header>
                ${s?`
                <a class="news-lead" href="${T(s.url)}" target="_blank" rel="noopener noreferrer">
                    <img src="${T(s.urlToImage)}" alt="" onerror="this.src='previews/no-episode.png'">
                    <div><span class="pill">${T(a(s))}</span><h2>${T(s.title)}</h2><p>${T(s.description||"")}</p><span class="muted">${M.timeAgo(new Date(s.publishedAt).getTime())}</span></div>
                </a>`:x.empty("news","No news right now","Check back later.")}
                <div class="news-grid">
                    ${i.map(e=>`
                    <a class="news-card" href="${T(e.url)}" target="_blank" rel="noopener noreferrer">
                        <span class="news-img"><img loading="lazy" src="${T(e.urlToImage)}" alt="" onerror="this.src='previews/no-episode.png'"></span>
                        <span class="news-src">${T(a(e))} · ${M.timeAgo(new Date(e.publishedAt).getTime())}</span>
                        <h3>${T(e.title)}</h3>
                        <p>${T(e.description||"")}</p>
                    </a>`).join("")}
                </div>
            </div>
            `+x.footer()}},settings:function t(s,i){M.setTitle("Settings");var e=M.player.sources(),a=(t,e)=>`<select data-setting="${t}">${e.map(([e,a])=>`<option value="${T(e)}"${String(E.get(t))===e?" selected":""}>${T(a)}</option>`).join("")}</select>`,n=e=>`<label class="switch"><input type="checkbox" data-toggle="${e}"${E.bool(e)?" checked":""}><span></span></label>`,r=(e,a,t)=>`<div class="setting"><div><h3>${e}</h3>${a?`<p>${a}</p>`:""}</div>${t}</div>`;s.innerHTML=`
            <div class="container page settings">
                <header class="page-head"><div><p class="eyebrow">Preferences</p><h1>Settings</h1></div></header>

                <section class="panel">
                    <h2>Appearance</h2>
                    ${r("Accent colour","Used for buttons, highlights and inside most players.",`<div class="swatches">${["#FF7575","#FF5A5F","#F43F5E","#A855F7","#6366F1","#3B82F6","#06B6D4","#10B981","#84CC16","#FACC15"].map(e=>`<button class="swatch${e.toLowerCase()===String(E.get("accent")).toLowerCase()?" on":""}" style="--c:${e}" data-accent="${e}" aria-label="${e}"></button>`).join("")}<label class="swatch swatch-custom" title="Custom colour"><input type="color" value="${T(E.get("accent"))}" data-accent-custom>${j("plus")}</label></div>`)}
                    ${r("Image quality","Lower quality loads faster on slow connections.",a("imageQuality",[["original","High"],["w500","Medium (default)"],["w200","Low"]]))}
                </section>

                <section class="panel">
                    <h2>Content</h2>
                    ${r("Metadata language","Titles and descriptions from TMDB. Doesn't change the audio language.",a("language",[["en-US","English"],["es-MX","Spanish"],["fr-FR","French"],["nl-NL","Dutch"],["pt-PT","Portuguese"],["tl-PH","Filipino"],["pl-PL","Polish"],["ru-RU","Russian"],["ro-RO","Romanian"],["de-DE","German"],["sv-SE","Swedish"],["he-IL","Hebrew"],["hi-IN","Hindi"],["ja-JP","Japanese"],["ko-KR","Korean"],["it-IT","Italian"]]))}
                    ${r("Hide unreleased","Hide seasons and episodes that haven't aired yet (the next one still shows).",n("hideUnreleased"))}
                    ${r("Hide spoilers","Blur thumbnails and descriptions of episodes you haven't watched.",n("hideSpoilers"))}
                </section>

                <section class="panel">
                    <h2>Playback</h2>
                    ${r("Default source","The player opens with this one; you can switch inside the player.",a("source",[["","Automatic (first)"],...e.map(e=>[e.name,e.sudo||e.name])]))}
                    ${r("Auto-mark as watched","Mark a movie or episode as watched as soon as you open it.",n("autoNext"))}
                </section>

                <section class="panel">
                    <h2>Privacy</h2>
                    ${r("Disguise tab","Shows the tab as “Google” with the Google icon.",n("disguise"))}
                </section>

                <section class="panel" id="data">
                    <h2>Your data</h2>
                    <p class="panel-note">Your list, history and watched episodes live in this browser only. Back them up to move to another device.</p>
                    <div class="data-stats">
                        <div><b>${H.watchlist().length}</b><span>in My List</span></div>
                        <div><b>${H.history().length}</b><span>in history</span></div>
                        <div><b>${H.watchedSet().size}</b><span>watched items</span></div>
                    </div>
                    <div class="actions">
                        <button class="btn btn-sm" data-action="export">${j("download")} Export backup</button>
                        <label class="btn btn-sm btn-ghost">${j("upload")} Import backup<input type="file" accept="application/json,.json" data-action="import" hidden></label>
                        <button class="btn btn-sm btn-ghost" data-action="clear-cache">Clear cached data</button>
                        <button class="btn btn-sm btn-danger" data-action="clear-all">${j("trash")} Erase everything</button>
                    </div>
                </section>

                <section class="panel kbd-panel">
                    <h2>Keyboard shortcuts</h2>
                    <p class="panel-note">For “go to” shortcuts, press <kbd>G</kbd>, let go, then press the second key within a second. Shortcuts don't work while you're typing in a box.</p>
                    <dl class="kbd-list">
                        ${[[["/"],"Jump to the search box"],[["Esc"],"Close the player or a popup"],[["↑","↓","Enter"],"Pick a search suggestion",!0],[["G","H"],"Go to Home"],[["G","M"],"Go to Movies"],[["G","S"],"Go to Series"],[["G","L"],"Go to My List"],[["G","N"],"Go to News"],[["G","O"],"Go to GOAT"]].map(([e,a,t])=>`<div><dt>${e.map(e=>`<kbd>${e}</kbd>`).join(t?" ":" <span>then</span> ")}</dt><dd>${a}</dd></div>`).join("")}
                    </dl>
                </section>
            </div>
            `+x.footer(),s.querySelectorAll("[data-setting]").forEach(e=>e.addEventListener("change",()=>{if(E.set(e.dataset.setting,e.value),"language"===e.dataset.setting){try{Object.keys(sessionStorage).filter(e=>e.startsWith("sm:")).forEach(e=>sessionStorage.removeItem(e))}catch{}location.reload()}else x.toast("Saved",{icon:"check"})})),s.querySelectorAll("[data-toggle]").forEach(e=>e.addEventListener("change",()=>{E.set(e.dataset.toggle,e.checked?"yes":"no"),"disguise"===e.dataset.toggle&&(M.applyDisguise(),e.checked||M.setTitle("Settings")),x.toast("Saved",{icon:"check"})}));let o=a=>{E.set("accent",a),M.applyAccent(a),s.querySelectorAll("[data-accent]").forEach(e=>e.classList.toggle("on",e.dataset.accent.toLowerCase()===a.toLowerCase()))};s.querySelectorAll("[data-accent]").forEach(e=>e.addEventListener("click",()=>o(e.dataset.accent))),s.querySelector("[data-accent-custom]").addEventListener("input",e=>o(e.target.value)),s.querySelector('[data-action="export"]').addEventListener("click",()=>{var e=new Blob([JSON.stringify(H.export(),null,2)],{type:"application/json"});let a=document.createElement("a");a.href=URL.createObjectURL(e),a.download=`heartive-backup-${_()}.json`,a.click(),setTimeout(()=>URL.revokeObjectURL(a.href),1e3)}),s.querySelector('[data-action="import"]').addEventListener("change",async e=>{if(e=e.target.files[0])try{H.import(JSON.parse(await e.text())),x.toast("Backup imported",{icon:"check"}),t(s,i)}catch(e){x.toast(e.message||"Couldn't read that file",{icon:"info"})}}),s.querySelector('[data-action="clear-cache"]').addEventListener("click",()=>{try{Object.keys(sessionStorage).filter(e=>e.startsWith("sm:")).forEach(e=>sessionStorage.removeItem(e))}catch{}x.toast("Cache cleared",{icon:"check"})}),s.querySelector('[data-action="clear-all"]').addEventListener("click",e=>{let a=e.currentTarget;a.dataset.confirm?(["watchlist","history","watched","goat"].forEach(e=>H.clear(e)),x.toast("All data erased",{icon:"trash"}),t(s,i)):(a.dataset.confirm="1",a.lastChild.textContent=" Click again to erase",setTimeout(()=>{delete a.dataset.confirm,a.lastChild.textContent=" Erase everything"},3e3))})},notFound:function(e){M.setTitle("Not found"),e.innerHTML=`<div class="container page">${x.empty("film","Page not found","That link doesn't go anywhere.",'<a class="btn" href="#/">Go home</a>')}</div>`}}})(window.SM);