-- ProofStake demo schema. This no-auth prototype stores points, not real funds.
-- Anyone with the public Data API key can act on these rows; do not use this
-- permission model for valuable balances or private user data.

create extension if not exists pgcrypto;
grant usage on schema public to anon, authenticated;

create table if not exists public.ps_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  username text not null check (char_length(username) between 3 and 24),
  avatar_color text not null,
  stakes_balance integer not null default 500 check (stakes_balance >= 0),
  bounties_earned integer not null default 0 check (bounties_earned >= 0),
  wins_count integer not null default 0 check (wins_count >= 0)
);

create unique index if not exists ps_profiles_username_lower_key
  on public.ps_profiles (lower(username));

create table if not exists public.ps_challenges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) between 1 and 1000),
  category text not null check (category in ('Coding', 'Fitness', 'Study', 'Habit', 'Other')),
  mode text not null check (mode in ('group', 'duel')),
  duration_days integer not null check (duration_days in (3, 7, 14, 30)),
  entry_stake integer not null check (entry_stake > 0),
  pot_total integer not null check (pot_total >= 0),
  creator_id uuid not null references public.ps_profiles (id),
  invite_code text not null unique check (char_length(invite_code) = 6),
  status text not null default 'active' check (status in ('active', 'completed'))
);

create table if not exists public.ps_participants (
  id uuid primary key default gen_random_uuid(),
  joined_at timestamptz not null default now(),
  challenge_id uuid not null references public.ps_challenges (id) on delete cascade,
  profile_id uuid not null references public.ps_profiles (id),
  current_streak integer not null default 0 check (current_streak >= 0),
  status text not null default 'active' check (status in ('active', 'eliminated', 'won')),
  unique (challenge_id, profile_id)
);

create table if not exists public.ps_proofs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  challenge_id uuid not null references public.ps_challenges (id) on delete cascade,
  profile_id uuid not null references public.ps_profiles (id),
  day_number integer not null check (day_number > 0),
  caption text not null check (char_length(caption) between 1 and 500),
  image_url text not null,
  approvals_count integer not null default 0 check (approvals_count >= 0),
  flags_count integer not null default 0 check (flags_count >= 0),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  unique (challenge_id, profile_id, day_number)
);

create table if not exists public.ps_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  proof_id uuid not null references public.ps_proofs (id) on delete cascade,
  verifier_id uuid not null references public.ps_profiles (id),
  verdict text not null check (verdict in ('approve', 'flag')),
  reason text not null default '' check (char_length(reason) <= 240),
  unique (proof_id, verifier_id)
);

create index if not exists ps_challenges_active_pot_idx
  on public.ps_challenges (pot_total desc, created_at desc)
  where status = 'active';
create index if not exists ps_participants_profile_id_idx
  on public.ps_participants (profile_id);
create index if not exists ps_proofs_profile_created_idx
  on public.ps_proofs (profile_id, created_at desc);
create index if not exists ps_proofs_pending_created_idx
  on public.ps_proofs (created_at desc)
  where status = 'pending';
create index if not exists ps_verifications_verifier_id_idx
  on public.ps_verifications (verifier_id);

alter table public.ps_profiles enable row level security;
alter table public.ps_challenges enable row level security;
alter table public.ps_participants enable row level security;
alter table public.ps_proofs enable row level security;
alter table public.ps_verifications enable row level security;

grant select, insert, update on
  public.ps_profiles,
  public.ps_challenges,
  public.ps_participants,
  public.ps_proofs
to anon, authenticated;
grant select, insert on
  public.ps_verifications
to anon, authenticated;

drop policy if exists "ProofStake public profile read" on public.ps_profiles;
create policy "ProofStake public profile read" on public.ps_profiles
  for select to anon, authenticated using (true);
drop policy if exists "ProofStake public profile create" on public.ps_profiles;
create policy "ProofStake public profile create" on public.ps_profiles
  for insert to anon, authenticated with check (true);
drop policy if exists "ProofStake public profile update" on public.ps_profiles;
create policy "ProofStake public profile update" on public.ps_profiles
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "ProofStake public challenge read" on public.ps_challenges;
create policy "ProofStake public challenge read" on public.ps_challenges
  for select to anon, authenticated using (true);
drop policy if exists "ProofStake public challenge create" on public.ps_challenges;
create policy "ProofStake public challenge create" on public.ps_challenges
  for insert to anon, authenticated with check (true);
drop policy if exists "ProofStake public challenge update" on public.ps_challenges;
create policy "ProofStake public challenge update" on public.ps_challenges
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "ProofStake public participant read" on public.ps_participants;
create policy "ProofStake public participant read" on public.ps_participants
  for select to anon, authenticated using (true);
drop policy if exists "ProofStake public participant create" on public.ps_participants;
create policy "ProofStake public participant create" on public.ps_participants
  for insert to anon, authenticated with check (true);
drop policy if exists "ProofStake public participant update" on public.ps_participants;
create policy "ProofStake public participant update" on public.ps_participants
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "ProofStake public proof read" on public.ps_proofs;
create policy "ProofStake public proof read" on public.ps_proofs
  for select to anon, authenticated using (true);
drop policy if exists "ProofStake public proof create" on public.ps_proofs;
create policy "ProofStake public proof create" on public.ps_proofs
  for insert to anon, authenticated with check (true);
drop policy if exists "ProofStake public proof update" on public.ps_proofs;
create policy "ProofStake public proof update" on public.ps_proofs
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "ProofStake public verification read" on public.ps_verifications;
create policy "ProofStake public verification read" on public.ps_verifications
  for select to anon, authenticated using (true);
drop policy if exists "ProofStake public verification create" on public.ps_verifications;
create policy "ProofStake public verification create" on public.ps_verifications
  for insert to anon, authenticated with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ps-proof-images', 'ps-proof-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ProofStake public proof image read" on storage.objects;
create policy "ProofStake public proof image read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'ps-proof-images');

drop policy if exists "ProofStake public proof image upload" on storage.objects;
create policy "ProofStake public proof image upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'ps-proof-images');
