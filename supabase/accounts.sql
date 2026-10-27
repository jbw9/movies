-- Movies accounts: a username and password per person, and their synced library.
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- The site only talks to the functions below. Both tables have row level security on with no
-- policies, so the public key can't read or change them directly. Passwords are stored as
-- bcrypt hashes; a device keeps a sign-in token, never the password.
--
-- Resetting someone's password (they email you their username):
--   update public.accounts set pass = extensions.crypt('their-new-password', extensions.gen_salt('bf', 10))
--   where username = 'their-username';
-- Add this too to sign them out everywhere:
--   delete from public.sessions where username = 'their-username';

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.accounts (
    username text primary key,
    pass text not null,
    data jsonb not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
    token uuid primary key default gen_random_uuid(),
    username text not null references public.accounts (username) on delete cascade,
    created_at timestamptz not null default now()
);

-- Shown in Settings so people can see and sign out their devices. `id` is what the site uses to
-- name another device's session; its token never leaves that device.
alter table public.sessions add column if not exists id bigint generated always as identity;
alter table public.sessions add column if not exists device text;
alter table public.sessions add column if not exists last_seen timestamptz not null default now();

-- These took fewer arguments before; drop the old versions so each name has one.
drop function if exists public.sign_up(text, text);
drop function if exists public.sign_in(text, text);
drop function if exists public.load_account(uuid);

alter table public.accounts enable row level security;
alter table public.sessions enable row level security;

create or replace function public.sign_up(uname text, pw text, dev text default null) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
    u text := lower(trim(uname));
    t uuid;
begin
    if u !~ '^[a-z0-9._-]{3,24}$' then
        raise exception 'Usernames are 3 to 24 letters, numbers, dots, dashes or underscores.';
    end if;
    if length(coalesce(pw, '')) < 6 then
        raise exception 'Passwords need at least 6 characters.';
    end if;
    begin
        insert into accounts (username, pass) values (u, crypt(pw, gen_salt('bf', 10)));
    exception when unique_violation then
        raise exception 'That username is taken.';
    end;
    insert into sessions (username, device) values (u, dev) returning token into t;
    return t;
end $$;

create or replace function public.sign_in(uname text, pw text, dev text default null) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
    u text := lower(trim(uname));
    t uuid;
begin
    if not exists (select 1 from accounts where username = u and pass = crypt(pw, pass)) then
        raise exception 'Wrong username or password.';
    end if;
    insert into sessions (username, device) values (u, dev) returning token into t;
    return t;
end $$;

-- "Signed out" tells the site the token is no longer valid (password reset, or signed out).
create or replace function public.load_account(tok uuid, dev text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
    r jsonb;
begin
    update sessions set last_seen = now(), device = coalesce(device, dev) where token = tok;
    select jsonb_build_object('username', a.username, 'data', a.data) into r
    from accounts a join sessions s on s.username = a.username
    where s.token = tok;
    if r is null then
        raise exception 'Signed out';
    end if;
    return r;
end $$;

create or replace function public.save_account(tok uuid, doc jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
    update accounts a set data = doc, updated_at = now()
    from sessions s
    where s.token = tok and s.username = a.username;
    if not found then
        raise exception 'Signed out';
    end if;
end $$;

create or replace function public.change_password(tok uuid, old_pw text, new_pw text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
    if length(coalesce(new_pw, '')) < 6 then
        raise exception 'Passwords need at least 6 characters.';
    end if;
    update accounts a set pass = crypt(new_pw, gen_salt('bf', 10))
    from sessions s
    where s.token = tok and s.username = a.username and a.pass = crypt(old_pw, a.pass);
    if not found then
        raise exception 'Current password is wrong.';
    end if;
end $$;

create or replace function public.sign_out(tok uuid) returns void
language sql security definer set search_path = public, extensions as $$
    delete from sessions where token = tok;
$$;

create or replace function public.list_sessions(tok uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
    u text;
begin
    select username into u from sessions where token = tok;
    if u is null then
        raise exception 'Signed out';
    end if;
    return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'device', device, 'last_seen', last_seen,
        'current', token = tok) order by token = tok desc, last_seen desc), '[]') from sessions where username = u);
end $$;

create or replace function public.end_session(tok uuid, sid bigint) returns void
language sql security definer set search_path = public, extensions as $$
    delete from sessions s using sessions me
    where me.token = tok and s.username = me.username and s.id = sid;
$$;

-- Once everyone has signed in on a device that used the old profiles, the old table can go:
--   drop table public.profiles;

-- Signing in a TV from a phone: the TV shows a short code (and a QR code of the link with it),
-- someone signed in on their phone enters it, and the TV picks up a session of its own. Only
-- the TV knows `secret`, so guessing a code can't collect the session it gets.
create table if not exists public.device_codes (
    code text primary key,
    secret uuid not null default gen_random_uuid(),
    dev text,
    token uuid,
    username text,
    created_at timestamptz not null default now()
);
alter table public.device_codes enable row level security;

create or replace function public.start_device_code(dev text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
    abc text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    bytes bytea;
    c text;
    s uuid;
begin
    delete from device_codes where created_at < now() - interval '10 minutes';
    loop
        bytes := gen_random_bytes(6);
        c := '';
        for i in 0..5 loop
            c := c || substr(abc, 1 + get_byte(bytes, i) % length(abc), 1);
        end loop;
        begin
            insert into device_codes (code, dev) values (c, dev) returning secret into s;
            exit;
        exception when unique_violation then
            null; -- taken: try another code
        end;
    end loop;
    return jsonb_build_object('code', c, 'secret', s);
end $$;

-- Null until someone approves it; then the TV's sign-in, handed out once.
create or replace function public.poll_device_code(c text, sec uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
    r device_codes;
begin
    select * into r from device_codes where code = c and secret = sec and created_at > now() - interval '10 minutes';
    if not found then
        raise exception 'Expired';
    end if;
    if r.token is null then
        return null;
    end if;
    delete from device_codes where code = c;
    return jsonb_build_object('username', r.username, 'token', r.token);
end $$;

create or replace function public.approve_device_code(tok uuid, c text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
    u text;
    d text;
    t uuid;
begin
    select username into u from sessions where token = tok;
    if u is null then
        raise exception 'Signed out';
    end if;
    select dev into d from device_codes
    where code = upper(trim(c)) and token is null and created_at > now() - interval '10 minutes';
    if not found then
        raise exception 'That code is wrong or has expired. Check the one on your TV.';
    end if;
    insert into sessions (username, device) values (u, d) returning token into t;
    update device_codes set token = t, username = u where code = upper(trim(c));
end $$;

-- Visits: one row per browser per day, signed in or not, with roughly where it is (the site looks
-- that up from the visitor's IP; see trackVisit in assets/js/sync.js).
create table if not exists public.visits (
    visitor uuid not null,
    day date not null default current_date,
    username text,
    views int not null default 1,
    country_code text,
    country text,
    region text,
    city text,
    first_at timestamptz not null default now(),
    last_at timestamptz not null default now(),
    primary key (visitor, day)
);
alter table public.visits enable row level security;
-- Seconds of video actually played, counted by the site while a player reports its position.
alter table public.visits add column if not exists watch_seconds int not null default 0;

create or replace function public.track_visit(vid uuid, tok uuid default null, cc text default null,
    country text default null, region text default null, city text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
    u text;
begin
    if tok is not null then
        select username into u from sessions where token = tok;
    end if;
    insert into visits as v (visitor, username, country_code, country, region, city)
    values (vid, u, left(upper(cc), 2), left(country, 80), left(region, 80), left(city, 80))
    on conflict (visitor, day) do update set
        views = v.views + 1,
        last_at = now(),
        username = coalesce(excluded.username, v.username),
        country_code = coalesce(excluded.country_code, v.country_code),
        country = coalesce(excluded.country, v.country),
        region = coalesce(excluded.region, v.region),
        city = coalesce(excluded.city, v.city);
end $$;

drop function if exists public.add_watch_time(uuid, int);
create or replace function public.add_watch_time(vid uuid, secs int, tok uuid default null) returns void
language sql security definer set search_path = public, extensions as $$
    insert into visits as v (visitor, username, views, watch_seconds)
    values (vid, (select username from sessions where token = tok), 0, least(greatest(secs, 0), 600))
    on conflict (visitor, day) do update set watch_seconds = v.watch_seconds + excluded.watch_seconds,
        username = coalesce(excluded.username, v.username), last_at = now();
$$;

-- The admin page (admin/index.html): every account with what's in it, its devices and what it
-- played, plus visits. Only a session belonging to `jonathan` gets an answer.
drop function if exists public.admin_overview(uuid);
create or replace function public.admin_overview(tok uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
    if not exists (select 1 from sessions where token = tok and username = 'jonathan') then
        raise exception 'Not allowed';
    end if;
    update sessions set last_seen = now() where token = tok;
    return jsonb_build_object(
        'accounts', (select coalesce(jsonb_agg(x.r order by x.created_at desc), '[]') from (
            select a.created_at, jsonb_build_object(
                'username', a.username,
                'created_at', a.created_at,
                'updated_at', a.updated_at,
                'counts', jsonb_build_object(
                    'watchlist', (select count(*) from jsonb_each(case when jsonb_typeof(a.data -> 'watchlist') = 'object' then a.data -> 'watchlist' else '{}' end) e where not (e.value ? 'gone')),
                    'goat', (select count(*) from jsonb_each(case when jsonb_typeof(a.data -> 'goat') = 'object' then a.data -> 'goat' else '{}' end) e where not (e.value ? 'gone')),
                    -- Watched marks are m-<movie> and e-<episode>; plays are in the log.
                    'movies', (select count(distinct k) from (
                        select substr(e.key, 3) k from jsonb_each(case when jsonb_typeof(a.data -> 'watched') = 'object' then a.data -> 'watched' else '{}' end) e
                        where e.key like 'm-%' and not (e.value ? 'gone')
                        union all
                        select e.value -> 'item' ->> 'id' from jsonb_each(case when jsonb_typeof(a.data -> 'log') = 'object' then a.data -> 'log' else '{}' end) e
                        where e.value -> 'item' ->> 'type' = 'movie' and not (e.value ? 'gone')) m),
                    'episodes', (select count(distinct k) from (
                        select substr(e.key, 3) k from jsonb_each(case when jsonb_typeof(a.data -> 'watched') = 'object' then a.data -> 'watched' else '{}' end) e
                        where e.key like 'e-%' and not (e.value ? 'gone')
                        union all
                        select coalesce(e.value -> 'item' ->> 'episodeId', (e.value -> 'item' ->> 'id') || 's' || (e.value -> 'item' ->> 'season') || 'e' || (e.value -> 'item' ->> 'episode'))
                        from jsonb_each(case when jsonb_typeof(a.data -> 'log') = 'object' then a.data -> 'log' else '{}' end) e
                        where e.value -> 'item' ->> 'type' = 'tv' and not (e.value ? 'gone')) m),
                    -- How far they got into everything with a resume point, in seconds.
                    'seconds', (select coalesce(sum(least((e.value -> 'item' ->> 't')::numeric, coalesce((e.value -> 'item' ->> 'd')::numeric, 1e9))), 0)::bigint
                        from jsonb_each(case when jsonb_typeof(a.data -> 'progress') = 'object' then a.data -> 'progress' else '{}' end) e
                        where not (e.value ? 'gone') and jsonb_typeof(e.value -> 'item' -> 't') = 'number')),
                'played', (select coalesce(jsonb_agg(p.i order by p.at desc), '[]') from (
                    select jsonb_build_object('type', e.value -> 'item' -> 'type', 'title', e.value -> 'item' -> 'title',
                        'year', e.value -> 'item' -> 'year', 'season', e.value -> 'item' -> 'season',
                        'episode', e.value -> 'item' -> 'episode', 'episodeName', e.value -> 'item' -> 'episodeName',
                        'at', e.value -> 'item' -> 'at') i, (e.value -> 'item' ->> 'at')::bigint at
                    from jsonb_each(case when jsonb_typeof(a.data -> 'log') = 'object' then a.data -> 'log' else '{}' end) e
                    where not (e.value ? 'gone')
                    order by at desc nulls last limit 500) p),
                'lists', (select jsonb_object_agg(sec, (select coalesce(jsonb_agg(jsonb_build_object('type', e.value -> 'item' -> 'type',
                        'title', e.value -> 'item' -> 'title', 'year', e.value -> 'item' -> 'year') order by e.value ->> 'at' desc), '[]')
                    from jsonb_each(case when jsonb_typeof(a.data -> sec) = 'object' then a.data -> sec else '{}' end) e
                    where not (e.value ? 'gone'))) from unnest(array['watchlist', 'goat']) sec),
                'devices', (select coalesce(jsonb_agg(jsonb_build_object('device', s.device, 'created_at', s.created_at,
                        'last_seen', s.last_seen) order by s.last_seen desc), '[]')
                    from sessions s where s.username = a.username)
            ) r from accounts a) x),
        'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'visitors', d.visitors,
                'signed_in', d.signed_in, 'views', d.views, 'new', d.new, 'seconds', d.seconds) order by d.day), '[]') from (
            select day, count(*) visitors, count(username) signed_in, sum(views) views, sum(watch_seconds) seconds,
                count(*) filter (where not exists (select 1 from visits o where o.visitor = v.visitor and o.day < v.day)) new
            from visits v where day > current_date - 30 group by day) d),
        'places', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from (
            select country_code cc, max(country) country, region, city, count(distinct visitor) visitors,
                count(distinct visitor) filter (where username is not null) signed_in
            from visits where country_code is not null group by country_code, region, city) p),
        'recent', (select coalesce(jsonb_agg(to_jsonb(r) order by r.last_at desc), '[]') from (
            select username, country_code cc, region, city, sum(views) views, sum(watch_seconds) seconds, max(last_at) last_at, count(*) days
            from visits group by visitor, username, country_code, region, city
            order by max(last_at) desc limit 100) r),
        'visitors', (select count(distinct visitor) from visits),
        -- A guest is a browser that wasn't signed in on any of those days.
        'visitors_30', (select count(distinct visitor) from visits where day > current_date - 30),
        'guests_30', (select count(*) from (select visitor from visits where day > current_date - 30
            group by visitor having count(username) = 0) g),
        'guest_seconds', (select coalesce(sum(watch_seconds), 0) from visits where username is null));
end $$;
