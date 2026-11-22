# Miss Bonus Quest

Les enfants déclarent des actes perso et collectifs ; les parents valident et
convertissent points et streaks en minutes d’écran gagnées.

Application PWA de la famille `miss-*` / `mister-*`, née du squelette
[`pwa-starter-kit`](https://github.com/mister-guiiug/pwa-starter-kit) et bâtie
sur [`@mister-guiiug/dev-pwa-config`](https://github.com/mister-guiiug/dev-pwa-config).

Design : [`docs/superpowers/specs/2026-11-22-miss-bonus-quest-design.md`](docs/superpowers/specs/2026-11-22-miss-bonus-quest-design.md).

## MVP 1 (livrée)

Foyer **local** sur l’appareil :

- profils parent / enfants ;
- catalogue d’actes (perso + collectif) avec points, minutes et streak ;
- déclaration enfant → validation / refus parent ;
- crédit manuel et consommation de minutes ;
- export / import / reset du foyer.

La sync multi-appareils Supabase (auth magic link, codes, RLS) est la suite.

## Démarrer

```bash
npm install
npm run dev
```

L’installation lit le socle sur GitHub Packages : exporter `NODE_AUTH_TOKEN`
(`read:packages`) avant `npm install`.

## Vérifier

```bash
npm test
npm run build
```
