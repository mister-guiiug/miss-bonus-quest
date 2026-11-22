import { jourParis } from './economy.ts';
import type { Declaration, Foyer, MouvementSolde } from './types.ts';

/** Garde les N derniers mois de mouvements / déclarations tranchées (ADR 0018). */
export const ARCHIVE_JOURS = 90;
const MAX_MOUVEMENTS = 400;
const MAX_DECLARATIONS = 200;

function coupeAvant(refIso: string, jours: number): string {
  const j = jourParis(refIso);
  const [y, m, d] = j.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - jours);
  return date.toISOString().slice(0, 10);
}

export function archiverFoyer(
  foyer: Foyer,
  ref = new Date().toISOString()
): Foyer {
  const limite = coupeAvant(ref, ARCHIVE_JOURS);

  let mouvements: MouvementSolde[] = foyer.mouvements.filter(
    m => jourParis(m.createdAt) >= limite
  );
  if (mouvements.length > MAX_MOUVEMENTS) {
    mouvements = mouvements
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, MAX_MOUVEMENTS);
  }

  const pending = foyer.declarations.filter(d => d.statut === 'en_attente');
  let tranchees: Declaration[] = foyer.declarations.filter(
    d =>
      d.statut !== 'en_attente' &&
      d.decidedAt &&
      jourParis(d.decidedAt) >= limite
  );
  if (tranchees.length > MAX_DECLARATIONS) {
    tranchees = tranchees
      .slice()
      .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
      .slice(0, MAX_DECLARATIONS);
  }

  return {
    ...foyer,
    mouvements,
    declarations: [...pending, ...tranchees],
  };
}
