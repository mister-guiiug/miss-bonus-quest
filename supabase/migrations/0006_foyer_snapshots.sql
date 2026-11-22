-- Instantanés de foyer Miss Bonus Quest (ADR 0014).
-- Le payload JSON est le même schéma que le magasin local versionné.
-- Les codes enfant / co-parent permettent un RPC sans session pour rejoindre.

create table foyer_snapshots (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  code_enfant text not null,
  code_coparent text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint foyer_snapshots_code_enfant_unique unique (code_enfant),
  constraint foyer_snapshots_code_coparent_unique unique (code_coparent)
);

alter table foyer_snapshots enable row level security;

create policy foyer_snapshots_select_owner
  on foyer_snapshots for select
  to authenticated
  using (owner_id = auth.uid());

create policy foyer_snapshots_insert_owner
  on foyer_snapshots for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy foyer_snapshots_update_owner
  on foyer_snapshots for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy foyer_snapshots_delete_owner
  on foyer_snapshots for delete
  to authenticated
  using (owner_id = auth.uid());

-- Lecture du payload par code (enfant ou co-parent), sans session.
-- Les codes sont stockés en clair en majuscules côté app ; rotation = régénération.
create or replace function foyer_par_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resultat jsonb;
  code text := upper(trim(p_code));
begin
  if code is null or code = '' then
    return null;
  end if;
  select payload into resultat
  from foyer_snapshots
  where code_enfant = code or code_coparent = code
  limit 1;
  return resultat;
end;
$$;

revoke all on function foyer_par_code(text) from public;
grant execute on function foyer_par_code(text) to anon, authenticated;
