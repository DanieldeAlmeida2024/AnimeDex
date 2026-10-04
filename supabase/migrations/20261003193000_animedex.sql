create table if not exists public.animes (
  id uuid primary key default gen_random_uuid(),
  animefire_url text not null unique,
  title text not null,
  alternate_title text,
  type text not null check (type in ('movie', 'series')),
  poster text,
  background text,
  description text,
  genres text[] not null default '{}',
  release_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  anime_id uuid not null references public.animes(id) on delete cascade,
  season integer not null default 1 check (season > 0),
  episode integer not null check (episode > 0),
  title text not null,
  episode_url text not null,
  streams jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (anime_id, season, episode)
);

create index if not exists episodes_anime_id_idx on public.episodes(anime_id);
create index if not exists animes_title_idx on public.animes using gin (to_tsvector('simple', title));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists animes_updated_at on public.animes;
create trigger animes_updated_at before update on public.animes for each row execute function public.set_updated_at();
drop trigger if exists episodes_updated_at on public.episodes;
create trigger episodes_updated_at before update on public.episodes for each row execute function public.set_updated_at();

alter table public.animes enable row level security;
alter table public.episodes enable row level security;
-- A Edge Function usa a service role no servidor; nenhum acesso direto público é necessário.
