# 0018 — MVP6 : PIN, plafond, undo sur le port, lecture seule

## Contexte

Après MVP5, trois frictions mesurées ou anticipées :

1. Le code foyer ouvre tous les profils enfant — un frère peut déclarer à la
   place d’un autre.
2. La validation s’écrivait tout de suite sur le port puis s’annulait en
   mémoire : un reload pendant les 8 s **gardait** la validation (écart avec
   ADR 0008).
3. « Créer mon foyer » laissait Léa/Tom sans formulaire — le geste mentait.

## Décision

1. **PIN enfant** (4 chiffres, hash SHA-256 comme les codes foyer) — optionnel,
   posé par le parent, exigé à l’entrée du profil.
2. **Undo validation** : l’UI montre le résultat ; le port et le push sync
   n’avancent qu’à l’expiration du sursis ou au soldage. Annuler restaure sans
   avoir écrit.
3. **Création** : formulaire nom / parent / enfants avant « Qui joue ? ».
4. **Plafond** `plafondMinutesJour` — refuse crédit / validation au-delà.
5. **Code lecture** + session `lectureSeule` — grand-parent sans mutation.
6. **Partage URL**, historique parent, avatars emoji/couleur, son optionnel,
   export texte de la semaine, archivage 90 j des mouvements.

## Conséquences

- `SyncBridge` ignore le push tant que `pendingUndo` est posé.
- Les e2e passent par le formulaire de création (défauts Léa/Tom/BONUS).
- Pas de notifications push (toujours écarté).

## Écarté

- PDF / canvas pour la semaine — fichier texte + partage natif suffisent.
- PIN côté serveur — le hash voyage dans le snapshot ; le plaintext jamais.
