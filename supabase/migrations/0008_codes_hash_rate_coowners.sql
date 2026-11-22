-- Codes hashés, rate-limit RPC, co-owners (ADR 0016).
-- Les colonnes code_* passent en SHA-256 hex ; le plaintext reste dans payload.

create extension if not exists pgcrypto with schema extensions;

alter table foyer_snapshots
  add column if not exists co_owner_ids uuid[] not null default '{}';

-- Backfill : convertir les codes encore en clair (longueur courte) en hash.
update foyer_snapshots
set
  code_enfant = encode(
    extensions.digest(upper(trim(code_enfant)), 'sha256'),
    'hex'
  )
where length(code_enfant) < 64;

update foyer_snapshots
set
  code_coparent = encode(
    extensions.digest(upper(trim(code_coparent)), 'sha256'),
    'hex'
  )
where length(code_coparent) < 64;

create unlogged table if not exists foyer_code_attempts (
  id bigserial primary key,
  code_hash text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists foyer_code_attempts_at_idx
  on foyer_code_attempts (attempted_at);

create or replace function foyer_par_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  resultat jsonb;
  code text := upper(trim(p_code));
  h text;
  tentatives int;
begin
  if code is null or code = '' then
    return null;
  end if;

  h := encode(digest(code, 'sha256'), 'hex');

  delete from foyer_code_attempts
  where attempted_at < now() - interval '5 minutes';

  insert into foyer_code_attempts (code_hash) values (h);

  select count(*)::int into tentatives
  from foyer_code_attempts
  where code_hash = h
    and attempted_at > now() - interval '1 minute';

  if tentatives > 20 then
    raise exception 'rate-limit' using errcode = 'P0001';
  end if;

  select payload into resultat
  from foyer_snapshots
  where code_enfant = h or code_coparent = h
  limit 1;
  return resultat;
end;
$$;

revoke all on function foyer_par_code(text) from public;
grant execute on function foyer_par_code(text) to anon, authenticated;

-- RLS : propriétaire ou co-owner.
drop policy if exists foyer_snapshots_select_owner on foyer_snapshots;
drop policy if exists foyer_snapshots_insert_owner on foyer_snapshots;
drop policy if exists foyer_snapshots_update_owner on foyer_snapshots;
drop policy if exists foyer_snapshots_delete_owner on foyer_snapshots;

create policy foyer_snapshots_select_member
  on foyer_snapshots for select
  to authenticated
  using (
    owner_id = auth.uid()
    or auth.uid() = any (co_owner_ids)
  );

create policy foyer_snapshots_insert_owner
  on foyer_snapshots for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy foyer_snapshots_update_member
  on foyer_snapshots for update
  to authenticated
  using (
    owner_id = auth.uid()
    or auth.uid() = any (co_owner_ids)
  )
  with check (
    owner_id = auth.uid()
    or auth.uid() = any (co_owner_ids)
  );

create policy foyer_snapshots_delete_owner
  on foyer_snapshots for delete
  to authenticated
  using (owner_id = auth.uid());

-- Co-parent authentifié : code co-parent → s’ajoute à co_owner_ids.
create or replace function foyer_rejoindre_coparent(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  snap foyer_snapshots%rowtype;
  code text := upper(trim(p_code));
  h text;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'auth-required' using errcode = 'P0001';
  end if;
  if code is null or code = '' then
    return null;
  end if;

  h := encode(digest(code, 'sha256'), 'hex');

  select * into snap
  from foyer_snapshots
  where code_coparent = h
  limit 1;

  if not found then
    return null;
  end if;

  if snap.owner_id <> uid and not (uid = any (snap.co_owner_ids)) then
    update foyer_snapshots
    set co_owner_ids = array_append(co_owner_ids, uid)
    where id = snap.id
      and not (uid = any (co_owner_ids));
  end if;

  return snap.payload;
end;
$$;

revoke all on function foyer_rejoindre_coparent(text) from public;
grant execute on function foyer_rejoindre_coparent(text) to authenticated;
