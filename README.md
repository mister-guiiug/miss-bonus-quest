# Miss Bonus Quest

Les enfants déclarent des actes perso et collectifs ; les parents valident et
convertissent points et streaks en minutes d’écran gagnées.

Application PWA de la famille `miss-*` / `mister-*`, née du squelette
[`pwa-starter-kit`](https://github.com/mister-guiiug/pwa-starter-kit) et bâtie
sur [`@mister-guiiug/dev-pwa-config`](https://github.com/mister-guiiug/dev-pwa-config).

Design : [`docs/superpowers/specs/2026-11-22-miss-bonus-quest-design.md`](docs/superpowers/specs/2026-11-22-miss-bonus-quest-design.md).

Sync : [ADR 0014](docs/adr/0014-sync-foyer-par-instantane.md).

## Ce qui est livré

Foyer **local** sur l’appareil, plus sync optionnelle par instantané Supabase :

- profils parent / enfants ; porte enfant / co-parent par code d’invitation ;
- catalogue d’actes (CRUD parent) avec points, minutes et streak ;
- déclaration enfant → validation / refus parent (motif optionnel) ;
- crédit manuel, consommation, réglages du foyer (taux, codes, membres) ;
- export / import / reset ;
- sync pousser / tirer quand `VITE_SUPABASE_*` est posé (migration
  `0006_foyer_snapshots.sql`).

Sans projet Supabase, l’app reste en mode local et le dit à l’écran.

## Démarrer

```bash
npm install
npm run dev
```

L’installation lit le socle sur GitHub Packages : exporter `NODE_AUTH_TOKEN`
(`read:packages`) avant `npm install`.

Port de développement : **5225** (catalogue famille).

## Vérifier

```bash
npm test
npm run build
```
