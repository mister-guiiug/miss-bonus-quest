# 0017 — MVP5 : porte créer/rejoindre, undo validation, lazy parent/enfant

## Contexte

Après MVP4 (sync vivante, codes hashés, QR), le premier lancement mélangeait
création locale et rejoindre distant ; `HomeScreen` dépassait 1 100 lignes et
chargeait parent + enfant dans le même morceau ; une validation parent n’avait
pas le sursis d’annulation déjà décidé pour les suppressions (ADR 0008) ; le QR
encodait le code nu, pas une URL ouvrable.

## Décision

1. **Porte** : premier lancement — « Créer mon foyer » ou « Rejoindre » ;
   `localStorage` marque le choix. `?code=` préremplit et saute la porte.
2. **Lazy-split** : `ChildView` / `ParentView` en `import()` différé ;
   `RoleGate` reste critique.
3. **Undo validation** : le magasin garde un snapshot 8 s (`UNDO_MS`) ; toast
   avec action « Annuler » (durée 0 côté UI, minuterie côté magasin).
4. **QR** : encode `urlInvitation(code)` (`?code=`), pas le plaintext seul.
5. **Transfert owner** : RPC `foyer_transferer_propriete` + mutation locale
   `ownerAuthId` ; co-parent cible déjà lié à un compte.
6. **Synthèse semaine**, événements PostHog `GESTES.OPERATION`, haptics
   `vibrate`, avatars initiales — sans notifications push (pas d’ADR push).

## Conséquences

- Les e2e doivent cliquer « Créer mon foyer » avant « Qui joue ? ».
- Un rechargement pendant le sursis **conserve** la validation (déjà écrite) —
  inverse de la suppression de note (ADR 0008) : ici le résultat est visible
  tout de suite ; l’annulation restaure le snapshot.
- Le budget de morceaux doit absorber le lazy parent sans dépasser
  `mainChunkKb`.

## Écarté

- Push notifications (Web Push + permission) — hors périmètre sans mesure
  d’usage ni ADR dédié.
- Schéma `missbonus:` natif — la PWA web ouvre `?code=` ; un schéma custom
  n’apporte rien sans app store.
