# 0015 — Grammaire Astryx + sync vivante (auth, file, Realtime, conflits)

## Contexte

MVP 2 a posé l’instantané foyer (ADR 0014) avec push / pull manuels. Mesuré
à l’usage :

- un parent connecté oublie le bouton « Pousser » : l’autre appareil reste
  stale ;
- hors ligne, l’écriture locale disparaît du cloud jusqu’à un geste explicite ;
- deux appareils qui écrivent sans se tirer s’écrasent sans le dire ;
- l’écran enfant n’indique pas le prochain geste rentable ;
- les tailles et couleurs de l’accueil mélangeaient classes Tailwind ad hoc
  et jetons `--dwc-*`, sans échelle nommée.

Le socle publie désormais `astryx.css` / `astryx-fluid.css` (grammaire Meta
MIT, alias des `--dwc-*`), `sync-queue` et `realtime/supabase`.

## Décision

1. **Grammaire Astryx, pas le paquet.** `index.css` importe `astryx.css` +
   `astryx-fluid.css`. La mise en page foyer pose des attributs `data-quest`
   et lit `--color-*`, `--spacing-*`, `--text-*`, `--radius-*` — une seule
   source de noms. Les composants du socle restent sur `--dwc-*` peints par
   la palette de l’app.

2. **Sync vivante dès magic link.** Un `SyncBridge` : à la connexion, tire
   puis démarre la file ; chaque `updatedAt` local enfile un push (clé =
   id foyer) ; Realtime `UPDATE` sur `foyer_snapshots` applique le distant.

3. **Conflit par `updatedAt`.** Le magasin porte un horodatage à chaque
   mutation. Si le local est plus récent que le distant reçu, on refuse
   d’écraser (`conflit`) et on re-pousse le local. Pas de merge champ à champ.

4. **Création d’enfant après code** sans session parent (`creerEnfantApresCode`).

5. **Polish produit** : bandeau « prochain acte → X min », streaks éditables
   dans le CRUD d’actes, erreurs métier dans les dictionnaires i18n.

## Conséquences

**Agréables.** Un parent connecté synchronise sans geste. Hors ligne, la file
rejoue. L’écran parle la même grammaire que le reste du parc qui a adopté
Astryx. Les erreurs suivent la locale.

**Désagréables.** Last-write-wins horodaté reste grossier (pas de CRDT).
Realtime exige la publication `supabase_realtime` (migration 0007) et une
session auth — l’enfant par code ne l’écoute pas. `astryx-fluid` change le
texte de _tous_ les composants du socle (décision d’app, volontaire).

## Écarté

- **Merge structurel** du payload : coût > bénéfice tant qu’un foyer a un
  parent primaire.
- **Realtime pour l’enfant sans compte** : le RPC code n’ouvre pas de canal
  authentifié ; le pull au déverrouillage suffit.
- **Paquet `@astryxdesign/core`** : le socle a déjà traduit la grammaire en
  custom properties ; un second runtime grossirait le budget.
