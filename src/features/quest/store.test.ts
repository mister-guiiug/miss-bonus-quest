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
