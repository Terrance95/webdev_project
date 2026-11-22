-- Run once in the Supabase SQL Editor before using DonateHub.
create extension if not exists pgcrypto;
create table if not exists public.donate_items (
 id uuid primary key default gen_random_uuid(), title text not null check (char_length(title) between 1 and 160), category text not null check (category in ('Clothes','Furniture','Textbooks','Laptops')), condition text not null check (condition in ('New','Like New','Good','Fair')), location text not null check (char_length(location) between 1 and 160), description text not null check (char_length(description) between 1 and 4000), donor_name text not null check (char_length(donor_name) between 1 and 120), donor_contact text not null check (char_length(donor_contact) between 1 and 200), image_url text, status text not null default 'available' check (status in ('available','claimed')), created_at timestamptz not null default now()
);
create table if not exists public.donate_claims (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references public.donate_items(id) on delete cascade, claimer_name text not null check (char_length(claimer_name) between 1 and 120), claimer_contact text not null check (char_length(claimer_contact) between 1 and 200), message text not null default '' check (char_length(message) <= 2000), created_at timestamptz not null default now()
);
create index if not exists donate_items_created_at_idx on public.donate_items (created_at desc);
create index if not exists donate_items_available_created_idx on public.donate_items (created_at desc) where status = 'available';
create index if not exists donate_claims_item_id_idx on public.donate_claims (item_id);
alter table public.donate_items enable row level security;
alter table public.donate_claims enable row level security;
revoke all on public.donate_items, public.donate_claims from anon, authenticated;
grant select, insert, update on public.donate_items to anon, authenticated;
grant select, insert on public.donate_claims to anon, authenticated;
create policy "Public donation browsing" on public.donate_items for select to anon, authenticated using (true);
create policy "Public donation posting" on public.donate_items for insert to anon, authenticated with check (status = 'available');
create policy "Public donation claiming" on public.donate_items for update to anon, authenticated using (status = 'available') with check (status = 'claimed');
create policy "Public claim browsing" on public.donate_claims for select to anon, authenticated using (true);
create policy "Public claim posting" on public.donate_claims for insert to anon, authenticated with check (true);
insert into storage.buckets (id, name, public) values ('donate-item-images', 'donate-item-images', true) on conflict (id) do update set public = true;
create policy "Public item image read" on storage.objects for select to anon, authenticated using (bucket_id = 'donate-item-images');
create policy "Public item image upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'donate-item-images');
