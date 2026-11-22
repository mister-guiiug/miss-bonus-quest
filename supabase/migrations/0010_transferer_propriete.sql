-- Transfert de propriétaire (ADR 0017).
-- L’ancien owner passe en co_owner ; le nouveau doit déjà être co-owner ou
-- figurer dans le payload (auth lié côté client avant l’appel).

create or replace function foyer_transferer_propriete(
  p_id text,
  p_nouveau uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ancien uuid;
  cos uuid[];
begin
  if auth.uid() is null then
    raise exception 'not-authenticated' using errcode = 'P0001';
  end if;

  select owner_id, co_owner_ids into ancien, cos
  from foyer_snapshots
  where id = p_id
  for update;

  if ancien is null then
    raise exception 'foyer-inconnu' using errcode = 'P0001';
  end if;

  if ancien <> auth.uid() then
    raise exception 'pas-proprietaire' using errcode = 'P0001';
  end if;

  if p_nouveau is null or p_nouveau = ancien then
    raise exception 'cible-invalide' using errcode = 'P0001';
  end if;

  cos := coalesce(cos, '{}');
  if not (p_nouveau = any (cos)) then
    cos := array_append(cos, p_nouveau);
  end if;
  cos := array_remove(cos, ancien);
  if not (ancien = any (cos)) then
    cos := array_append(cos, ancien);
  end if;

  update foyer_snapshots
  set
    owner_id = p_nouveau,
    co_owner_ids = cos,
    updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function foyer_transferer_propriete(text, uuid) from public;
-- revoke from public ne retire pas EXECUTE à anon (privilège par défaut
-- Supabase) — même garde que 0009 pour foyer_rejoindre_coparent.
revoke all on function foyer_transferer_propriete(text, uuid) from anon;
grant execute on function foyer_transferer_propriete(text, uuid) to authenticated;
