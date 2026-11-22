import { describe, expect, it } from 'vitest';
import { archiverFoyer, ARCHIVE_JOURS } from './archive.ts';
import { foyerSeed } from './catalogue.ts';

describe('archiverFoyer', () => {
  it(`retire les mouvements plus vieux que ${ARCHIVE_JOURS} jours`, () => {
    const foyer = foyerSeed();
    const lea = foyer.membres.find(m => m.displayName === 'Léa')!;
    const parent = foyer.membres.find(m => m.role === 'parent')!;
    foyer.mouvements = [
      {
        id: 'old',
        enfantId: lea.id,
        type: 'credit_manuel',
        minutes: 5,
        pointsSource: null,
        declarationId: null,
        note: null,
        createdAt: '2020-01-01T12:00:00.000Z',
        createdBy: parent.id,
      },
      {
        id: 'new',
        enfantId: lea.id,
        type: 'credit_manuel',
        minutes: 3,
        pointsSource: null,
        declarationId: null,
        note: null,
        createdAt: new Date().toISOString(),
        createdBy: parent.id,
      },
    ];
    const out = archiverFoyer(foyer);
    expect(out.mouvements.map(m => m.id)).toEqual(['new']);
  });
});
