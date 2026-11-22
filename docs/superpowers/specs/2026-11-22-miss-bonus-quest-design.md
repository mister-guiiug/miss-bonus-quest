# Miss Bonus Quest — design v1

Date : 2026-11-22  
Id dépôt : `miss-bonus-quest`  
Statut : validé en atelier (sections 1–5)

## 1. Problème & promesse

Les enfants veulent plus de temps d’écran ; les parents veulent que ce temps soit lié à des gestes utiles (perso et collectifs), avec un contrôle parental clair.

**Promesse v1 :** une PWA foyer synchronisée où l’enfant déclare des actes, gagne points / minutes / paliers, et le parent valide. L’app est un **carnet d’honneur** : elle calcule le solde mérité ; le parent autorise tablette / écran ailleurs (pas de blocage OS).

## 2. Utilisateurs & rôles

| Rôle   | Auth                                                | Pouvoirs                                                                                                                               |
| ------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Parent | E-mail + magic link (Supabase Auth)                 | Créer / gérer le foyer, inviter, configurer actes & taux, valider / refuser, créditer manuellement, marquer des minutes « consommées » |
| Enfant | Profil sans e-mail, joint via **code d’invitation** | Déclarer des actes, voir solde, streaks, historique                                                                                    |

Plusieurs enfants par foyer. Plusieurs parents possibles (co-parents invités). Un membre n’appartient qu’à un foyer en v1.

## 3. Approche technique

**Choix : Supabase foyer** (Auth, Postgres, Realtime, RLS).

- Génération : `npx --allow-git=root github:mister-guiiug/create-lg-pwa-app miss-bonus-quest --publish`
- Socle : `@mister-guiiug/dev-pwa-config` (modules `auth/supabase`, `realtime/supabase`, `supabase-client`, file hors-ligne si applicable)
- CI : workflows `@v6` + migrations Supabase du socle
- Hors ligne : cache lecture ; déclarations en file puis sync ; le statut serveur fait foi en cas de conflit

Écartées pour la v1 : local-first pur, Firebase, blocage appareil.

## 4. Modèle de données

### 4.1 Entités

- **`foyer`** — id, nom, code_invitation (régénérable), taux_points_vers_minutes (ex. 10 points → 5 minutes), créé_at
- **`membre`** — id, foyer_id, rôle (`parent` | `enfant`), display_name, auth_user_id (nullable pour enfant), avatar optionnel, actif
- **`acte`** — id, foyer_id (toujours renseigné en base : le catalogue système est une constante app, **copiée** à la création du foyer), titre, description, icône, portée (`perso` | `collectif`), points (int ≥ 0), minutes_directes (int ≥ 0), streak (nullable : jours_requis, bonus_points, bonus_minutes), actif, ordre
- **`declaration`** — id, foyer_id, acte_id, declare_par (membre_id), statut (`en_attente` | `validee` | `refusee`), motif_refus (nullable), valide_par (nullable), participants (membre_ids[] — pour collectif, au moins un), created_at, decided_at
- **`mouvement_solde`** — id, foyer_id, enfant_id, type (`credit_validation` | `credit_manuel` | `bonus_streak` | `consommation`), minutes, points_source (nullable), declaration_id (nullable), note, created_at, created_by

Le **solde minutes** d’un enfant = somme des mouvements (crédits positifs, consommations négatives). Les points ne sont pas un second portefeuille : à la validation ils se convertissent selon le taux foyer ; l’UI peut afficher « +10 pts ≈ 5 min » à titre pédagogique.

### 4.2 Règles métier

1. **Déclaration enfant** → toujours `en_attente` ; crédits seulement après `validee`.
2. **Crédit parent** → mouvement `credit_manuel` immédiat (et éventuellement une déclaration déjà `validee` pour l’historique).
3. **Collectif** : à la validation, chaque participant coché reçoit le même crédit (points convertis + minutes directes). Le bonus streak, s’il existe, est calculé **par enfant** selon sa propre série.
4. **Streak (v1 figée)** : jours calendaires consécutifs (fuseau du foyer = Europe/Paris par défaut) avec ≥ 1 déclaration **validée** pour cet acte et cet enfant. Quand `jours_requis` est atteint, verser `bonus_*` une fois, puis **remettre la série à 0**. Une journée sans validation validée casse la série (remise à 0). Pas de plusieurs paliers empilés en v1 : un seul `jours_requis` par acte.
5. **Anti-doublon v1** : au plus une déclaration `en_attente` par (acte, enfant déclarant). Pas de photo preuve.
6. **Conversion** : `minutes_from_points = floor(points * minutes_taux / points_taux)` avec le couple configuré au foyer (ex. 10 → 5).
7. **Consommation** : seul un parent marque N minutes consommées. Solde affiché = max(0, somme des mouvements).

### 4.3 Catalogue initial (copié, désactivable)

Perso (ex.) : faire son lit ; ranger sa chambre.  
Collectif / maison (ex.) : mettre la table ; débarrasser la table ; faire la vaisselle ; passer le balai.  
Valeurs points / minutes / streaks : réglables ; streaks suggérées sur « faire son lit » (1 / 2 / 3 jours).

## 5. Parcours & écrans

### Enfant

1. **Accueil** — solde minutes, aperçu « prochain acte → X min », streaks, CTA déclaration
2. **Catalogue** — actes actifs perso / collectif
3. **Déclaration** — confirmation ; si collectif, cocher participants
4. **Historique** — filtres en attente / validé / refusé

### Parent

1. **Tableau de bord** — file à valider (Realtime), soldes par enfant
2. **Validation** — valider / refuser (+ motif optionnel)
3. **Crédit manuel** — enfant(s) + acte → crédit
4. **Catalogue** — activer / éditer / créer / désactiver actes
5. **Foyer** — enfants, code invitation, co-parents, taux points→minutes, marquage consommation

### Auth

- Parent : magic link → crée un foyer **ou** rejoint comme co-parent via **lien / code co-parent** distinct du code enfant (même foyer, rôle `parent`, `auth_user_id` renseigné).
- Enfant : saisie du **code enfant** + prénom (création de profil ou sélection d’un profil enfant existant du foyer) → session appareil liée à `membre_id` (anon Supabase ou jeton foyer à portée limitée — pas de droits parent). Changer d’enfant sur l’appareil = resaisie du code ou écran « qui es-tu ? » limité aux profils du foyer déjà déverrouillé.

## 6. Sécurité (RLS)

- Isolation stricte par `foyer_id`.
- Lecture : membres du foyer.
- Écriture déclarations `en_attente` : enfant (soi comme `declare_par`) ou parent.
- Transition `validee` / `refusee`, CRUD actes, réglages, mouvements consommation / crédit manuel : **parents uniquement**.
- Codes : code enfant et code co-parent **distincts**, régénérables par un parent ; stockage hashé ; le code enfant ne peut pas créer un membre `parent`.

## 7. Erreurs & sync

| Situation         | Comportement                                                          |
| ----------------- | --------------------------------------------------------------------- |
| Hors ligne        | UI en lecture cache ; file des déclarations ; sync au retour          |
| Double validation | Idempotent ; toast si déjà décidé                                     |
| Refus             | Statut `refusee`, pas de mouvement ; enfant notifié dans l’historique |
| Taux modifié      | S’applique aux **prochaines** validations seulement                   |

## 8. Tests v1

- Unit : conversion points→minutes, calcul streak / palier, solde (crédits − consommations)
- Intégration / e2e ciblés : déclaration → validation → solde ; crédit manuel ; RLS parent vs enfant

## 9. Hors scope v1

- Blocage réel de l’appareil / Screen Time OS / MDM
- Photo preuve, chat, paiements
- Multi-foyers par compte, comptes e-mail enfants
- Notifications push (reporté)
- Chronomètre de session d’écran dans l’app

## 10. Livraison parc

1. Générer `miss-bonus-quest` via le générateur (`--publish`)
2. Brancher Supabase (projet, migrations, vars CI)
3. Implémenter selon plan d’implémentation dédié
4. `apply-rulesets` + PR d’inscription au catalogue `FAMILY_APPS`
5. Ne pas inventer dans le socle : réutiliser auth / realtime / file hors-ligne existants

## 11. Décisions tranchées (atelier)

| Sujet         | Choix                                           |
| ------------- | ----------------------------------------------- |
| Usage         | Appareils séparés synchronisés                  |
| Foyer         | Multi-enfants + actes collectifs                |
| Récompenses   | Mix points→minutes + minutes directes + streaks |
| Temps d’écran | Carnet d’honneur (pas de blocage)               |
| Auth          | Parent magic link + code enfant                 |
| Validation    | File parent + crédit manuel parent              |
| Catalogue     | Prédéfini + CRUD parent                         |
| Backend       | Supabase                                        |
| Nom           | Miss Bonus Quest (`miss-bonus-quest`)           |
