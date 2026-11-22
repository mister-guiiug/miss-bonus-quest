# 0016 — Compte parent lié, codes hashés, pull enfant, carnet

## Contexte

Après MVP 3 (ADR 0015), mesuré à l’atelier :

- le magic link n’attache pas le profil parent local à `auth.uid()` : la sync
  `owner_id` reste un accident de premier push ;
- les codes foyer sont en clair en base (ADR 0014) : un dump ou une fuite RPC
  donne l’entrée ;
- l’enfant après code n’a pas de Realtime : soldes et refus restent stale ;
- le conflit `updatedAt` toast sans geste ; l’écran parent est une pile ;
- le carnet d’honneur (mouvements) n’est pas montré à l’enfant.

## Décision

1. **`ownerAuthId` + `membre.authUserId`** dans le payload ; à la connexion,
   le parent courant se lie et pousse. Co-parent authentifié : RPC
   `foyer_rejoindre_coparent` ajoute `auth.uid()` à `co_owner_ids` ; RLS
   élargi propriétaire ∪ co-owners.
2. **Codes en SHA-256** dans les colonnes `code_*` ; plaintext seulement dans
   le payload local. RPC `foyer_par_code` hashe l’entrée et rate-limite
   (20 / min / hash) via `foyer_code_attempts`.
3. **Session porte `codeInvite`** ; l’enfant poll (focus + 45 s) via
   `rejoindreParCode` sans compte.
4. **Bannière de conflit** : garder local / prendre le cloud.
5. **Parent en onglets** (inbox → actions → foyer → actes) ; **carnet**
   mouvements côté enfant ; **badge** barre basse = déclarations en attente.
6. **Icônes d’actes**, streaks seed enrichies, QR du code (peer `uqr`).

## Conséquences

**Agréables.** Auth et sync coïncident. Brute-force codes borné. Enfant et
parent voient des données fraîches. L’écran parent tient au téléphone.

**Désagréables.** Un appareil qui poussait encore des codes en clair après
migration 0008 échoue l’upsert jusqu’à mise à jour de l’app. Le rate-limit
est par hash de code, pas par IP (PostgREST ne la passe pas au SQL).

## Écarté

- Tables normalisées + RLS fine (ADR 0014).
- Notifications push (hors scope design §9).
- CRDT / merge champ à champ.
