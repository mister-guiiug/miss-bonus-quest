# 0019 — MVP7 : plafond visible, multi-validation, mode aîné

## Contexte

Après MVP6, trois frictions restaient mesurables :

1. Le plafond jour refusait côté parent, mais l’enfant ne voyait pas sa
   progression — déclarations vouées au rejet.
2. Les soirs chargés : une validation à la fois, motifs de refus saisis à la
   main.
3. Les fratries demandent qu’un aîné puisse trancher les actes des plus jeunes
   sans ouvrir le profil parent.

Le soldage du sursis d’annulation (ADR 0018) disparaissait sans feedback : le
toast « Annuler » expire, l’écriture port se fait, et personne ne le dit.

## Décision

1. **Barre de plafond** + objectif semaine dans l’UI enfant ; thème `accentColor`
   du foyer (`--quest-accent`).
2. **Multi-validation** + puces de motifs de refus ; partage invitation avec
   option « partager puis régénérer ».
3. **Mode aîné** : `membre.peutValider` — un enfant peut valider / refuser les
   déclarations où il n’est ni déclarant ni participant.
4. **Événement `quest:validation-figee`** à l’expiration / soldage du sursis ;
   toast + PostHog (`validation_figee`, `plafond_atteint`, `definir_pin`,
   `partage_invite`, `lecture_seule`, `valider_plusieurs`).
5. Badge onglet / `setAppBadge` + `Notification` locale **uniquement** si la
   permission est déjà accordée — pas de push, pas de demande de permission.

## Conséquences

- Le schéma foyer gagne des champs optionnels (rétro-compatibles).
- E2e : hook `/?e2e=conflict` pour la bannière de conflit sans backend.
- Photo d’acte et notifications push restent écartées.

## Écarté

- Widget natif « prochain acte » (PWA) — carte sticky suffisante.
- Prune cloud des mouvements — hint UI seulement ; RPC plus tard.
