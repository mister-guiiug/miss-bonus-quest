import { beforeEach, describe, expect, it } from 'vitest';
import { useQuest } from './store.ts';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useQuest.getState().reset();
  useQuest.getState().load();
});

describe('useQuest MVP1', () => {
  it('déclare, valide et crédite le solde', () => {
    const state = useQuest.getState();
    const enfant = state.foyer.membres.find(m => m.role === 'enfant')!;
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    const acte = state.foyer.actes.find(a => a.titre === 'Ranger sa chambre')!;

    state.choisirRole({ role: 'enfant', membreId: enfant.id });
    expect(state.declarer(acte.id, [])).toBeNull();

    const decl = useQuest.getState().foyer.declarations[0]!;
    expect(decl.statut).toBe('en_attente');

    useQuest.getState().choisirRole({ role: 'parent', membreId: parent.id });
    expect(useQuest.getState().valider(decl.id, parent.id)).toBeNull();

    // 15 pts → 7 min + 5 directes = 12
    expect(useQuest.getState().solde(enfant.id)).toBe(12);
    expect(useQuest.getState().foyer.declarations[0]!.statut).toBe('validee');
  });

  it('refuse une seconde déclaration en attente du même acte', () => {
    const state = useQuest.getState();
    const enfant = state.foyer.membres.find(m => m.role === 'enfant')!;
    const acte = state.foyer.actes[0]!;
    state.choisirRole({ role: 'enfant', membreId: enfant.id });
    expect(state.declarer(acte.id, [])).toBeNull();
    expect(useQuest.getState().declarer(acte.id, [])).toBe('deja-en-attente');
  });

  it('crédite manuellement et consomme sans passer sous zéro', () => {
    const state = useQuest.getState();
    const enfant = state.foyer.membres.find(m => m.role === 'enfant')!;
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    const acte = state.foyer.actes.find(a => a.titre === 'Passer le balai')!;

    expect(state.creditManuel(acte.id, [enfant.id], parent.id)).toBeNull();
    // 10 pts → 5 + 5 directes = 10
    expect(useQuest.getState().solde(enfant.id)).toBe(10);

    expect(useQuest.getState().consommer(enfant.id, 4, parent.id)).toBeNull();
    expect(useQuest.getState().solde(enfant.id)).toBe(6);

    expect(useQuest.getState().consommer(enfant.id, 100, parent.id)).toBeNull();
    expect(useQuest.getState().solde(enfant.id)).toBe(0);
  });
});

describe('useQuest MVP2', () => {
  it('déverrouille par code enfant et co-parent', () => {
    const state = useQuest.getState();
    expect(state.deverrouillerParCode('bonus')).toEqual({ role: 'enfant' });
    expect(state.deverrouillerParCode('PARENT')).toEqual({ role: 'coparent' });
    expect(state.deverrouillerParCode('XXXX')).toBeNull();
  });

  it('refuse une déclaration avec motif', () => {
    const state = useQuest.getState();
    const enfant = state.foyer.membres.find(m => m.role === 'enfant')!;
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    const acte = state.foyer.actes[0]!;

    state.choisirRole({ role: 'enfant', membreId: enfant.id });
    expect(state.declarer(acte.id, [])).toBeNull();
    const decl = useQuest.getState().foyer.declarations[0]!;

    useQuest.getState().choisirRole({ role: 'parent', membreId: parent.id });
    expect(
      useQuest.getState().refuser(decl.id, parent.id, 'Pas assez soigné')
    ).toBeNull();

    const after = useQuest.getState().foyer.declarations[0]!;
    expect(after.statut).toBe('refusee');
    expect(after.motifRefus).toBe('Pas assez soigné');
    expect(useQuest.getState().solde(enfant.id)).toBe(0);
  });

  it('met à jour le foyer et régénère un code', () => {
    const state = useQuest.getState();
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    state.choisirRole({ role: 'parent', membreId: parent.id });

    expect(state.majFoyer({ nom: 'Chez nous', pointsTaux: 20, minutesTaux: 10 }))
      .toBeNull();
    expect(useQuest.getState().foyer.nom).toBe('Chez nous');
    expect(useQuest.getState().foyer.pointsTaux).toBe(20);

    const avant = useQuest.getState().foyer.codeEnfant;
    expect(useQuest.getState().regenererCode('enfant')).toBeNull();
    expect(useQuest.getState().foyer.codeEnfant).not.toBe(avant);
  });

  it('ajoute un enfant et crée un acte', () => {
    const state = useQuest.getState();
    const parent = state.foyer.membres.find(m => m.role === 'parent')!;
    state.choisirRole({ role: 'parent', membreId: parent.id });

    expect(state.ajouterMembre('enfant', 'Nina')).toBeNull();
    expect(
      useQuest.getState().foyer.membres.some(m => m.displayName === 'Nina')
    ).toBe(true);

    const avant = useQuest.getState().foyer.actes.length;
    expect(
      state.upsertActe(null, {
        titre: 'Vider le lave-vaisselle',
        description: 'tous les jours',
        portee: 'perso',
        points: 8,
        minutesDirectes: 2,
        streak: null,
        actif: true,
      })
    ).toBeNull();
    expect(useQuest.getState().foyer.actes.length).toBe(avant + 1);
  });
});
