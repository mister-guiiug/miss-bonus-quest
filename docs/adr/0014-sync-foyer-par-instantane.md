# 0014 — Sync foyer par instantané JSON, pas par tables normalisées

## Contexte

MVP 1 tient le foyer entier dans un magasin versionné local (`createVersionedStore`).
Le design (22/11/2026) demande multi-appareils : parent pousse, enfant / co-parent
rejoignent par code, magic link quand Supabase est branché.

Normaliser `membres`, `actes`, `declarations`, `mouvements`, `streaks` en tables
RLS séparées imposerait :

- une migration par évolution du schéma métier ;
- des politiques RLS croisées (qui voit quoi selon le code, le rôle, le foyer) ;
- un protocole de sync champ à champ alors que l’UI lit déjà un **document** foyer.

Le parc a déjà payé ce coût sur d’autres domaines (notes filetées, files hors ligne).
Ici le produit est un foyer unique par famille, modifié en rafales courtes, et le
magasin local est déjà la source de vérité en mode local.

## Décision

**Un instantané JSON par foyer** dans `foyer_snapshots` :

- `payload` = le même schéma Zod que le magasin local ;
- propriétaire = `auth.uid()` (parent connecté) ;
- codes enfant / co-parent en colonnes, uniques, pour un RPC `foyer_par_code`
  (`security definer`) qui rend le payload **sans session** ;
- pousser / tirer côté app = upsert / select du snapshot, pas de Realtime
  obligatoire pour MVP 2.

Le mode local reste inchangé si `VITE_SUPABASE_*` manque : `syncDisponible()`
est faux, et l’UI le dit.

## Conséquences

**Agréables.** Un seul schéma à faire évoluer (Zod + migration qui ne touche
que `payload`). Le code d’invitation marche hors compte. La sync multi-appareils
est un bouton parent, pas un protocole.

**Désagréables.** Deux appareils qui écrivent sans se tirer écrasent l’un
l’autre (last-write-wins). Les codes sont stockés en clair (rotation =
régénération). Le RPC expose le foyer entier à qui connaît un code — voulu,
mais la rotation devient un geste parent obligatoire après partage large.

## Écarté

- **Tables normalisées + RLS fine** : coût disproportionné tant que le foyer
  tient dans un document et que le conflit multi-parents n’est pas mesuré.
- **Realtime obligatoire** : un pull / push explicite suffit pour MVP 2 ;
  Realtime pourra s’ajouter sans changer le stockage.
- **Sync P2P / QR sans backend** : hors couverture auth déjà prévue (magic link).
