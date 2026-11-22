import { describe, expect, it } from 'vitest';
import { foyerSeed } from './catalogue.ts';
import { synthetiserSemaine } from './weekly-summary.ts';

describe('synthetiserSemaine', () => {
  it('agrège gains et consommations de la semaine', () => {
    const foyer = foyerSeed();
    const lea = foyer.membres.find(m => m.displayName === 'Léa')!;
    const parent = foyer.membres.find(m => m.role === 'parent')!;
    const now = '2026-11-18T10:00:00.000Z'; // mercredi
    foyer.mouvements = [
      {
        id: 'm1',
        enfantId: lea.id,
        type: 'credit_validation',
        minutes: 10,
        pointsSource: 20,
        declarationId: null,
        note: null,
        createdAt: now,
        createdBy: parent.id,
      },
      {
        id: 'm2',
        enfantId: lea.id,
        type: 'consommation',
        minutes: -3,
        pointsSource: null,
        declarationId: null,
        note: null,
        createdAt: now,
        createdBy: parent.id,
      },
    ];
    const s = synthetiserSemaine(foyer, now);
    expect(s.debut).toBe('2026-11-16');
    expect(s.fin).toBe('2026-11-22');
    const row = s.parEnfant.find(e => e.enfantId === lea.id)!;
    expect(row.minutesGagnees).toBe(10);
    expect(row.minutesConsommees).toBe(3);
  });
});
