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
