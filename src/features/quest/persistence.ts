import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import { foyerSeed } from './catalogue.ts';
import { foyerSchema } from './schema.ts';
import type { Foyer } from './types.ts';

const PREFIX = 'miss-bonus-quest_';

export const foyerStore = createVersionedStore<Foyer>({
  store: PREFIX,
  key: 'foyer',
  version: 1,
  validate: data => {
    const parsed = foyerSchema.parse(data);
    return {
      ...parsed,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  },
  seed: () => foyerSeed(),
});

export function exportFoyer(): string | null {
  return foyerStore.export();
}

export function importFoyer(json: string): Foyer {
  return foyerStore.import(json);
}

export function clearFoyer(): void {
  foyerStore.clear();
}
