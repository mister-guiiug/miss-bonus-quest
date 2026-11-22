-- Corrige les deux écarts relevés par structure-securite.test.sql (ADR 0016) :
-- 1. foyer_code_attempts sans RLS (table public exposée à la clé anon).
-- 2. foyer_rejoindre_coparent encore exécutable par anon (privilège par défaut
--    Supabase) : réservé à authenticated.

alter table foyer_code_attempts enable row level security;

-- Aucune politique : anon / authenticated ne voient rien. Le SECURITY DEFINER
-- foyer_par_code s’exécute en propriétaire (BYPASSRLS) et continue d’écrire.

revoke all on function foyer_rejoindre_coparent(text) from public;
revoke all on function foyer_rejoindre_coparent(text) from anon;
grant execute on function foyer_rejoindre_coparent(text) to authenticated;
