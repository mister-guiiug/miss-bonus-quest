-- Publication Realtime pour l'inbox parent (ADR 0015 / sync foyer).
-- Sans cette ligne, l'abonnement postgres_changes se connecte sans rien recevoir.

alter publication supabase_realtime add table foyer_snapshots;
