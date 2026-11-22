import { describe, expect, it } from 'vitest';
import { foyerSeed } from './catalogue.ts';
import { prochainActe } from './next-act.ts';

describe('prochainActe', () => {
  it('propose le premier acte actif sans déclaration en attente', () => {
    const foyer = foyerSeed();
    const enfant = foyer.membres.find(m => m.role === 'enfant')!;
    const next = prochainActe(foyer, enfant.id);
    expect(next).not.toBeNull();
    expect(next!.minutes).toBeGreaterThan(0);
  });

  it('ignore les actes déjà en attente pour cet enfant', () => {
    const foyer = foyerSeed();
    const enfant = foyer.membres.find(m => m.role === 'enfant')!;
    const premier = foyer.actes.find(a => a.actif)!;
    foyer.declarations.push({
      id: 'decl-1',
      acteId: premier.id,
      declarePar: enfant.id,
      statut: 'en_attente',
      motifRefus: null,
      validePar: null,
      participants: [enfant.id],
      createdAt: new Date().toISOString(),
      decidedAt: null,
    });
    const next = prochainActe(foyer, enfant.id);
    expect(next?.acte.id).not.toBe(premier.id);
  });
});
