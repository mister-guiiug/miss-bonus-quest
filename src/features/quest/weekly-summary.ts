import { jourParis } from './economy.ts';
import type { Foyer } from './types.ts';

export type SyntheseEnfant = {
  enfantId: string;
  displayName: string;
  minutesGagnees: number;
  minutesConsommees: number;
  validations: number;
};

export type SyntheseSemaine = {
  debut: string;
  fin: string;
  parEnfant: SyntheseEnfant[];
};

/** Lundi Europe/Paris de la semaine contenant `ref`. */
function partsJour(yyyyMmDd: string): [number, number, number] {
  const [ys, ms, ds] = yyyyMmDd.split('-');
  return [Number(ys), Number(ms), Number(ds)];
}

function lundiDe(refIso: string): string {
  const jour = jourParis(refIso);
  const [y, m, d] = partsJour(jour);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay(); // 0=dim
  const delta = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function plusJours(yyyyMmDd: string, n: number): string {
  const [y, m, d] = partsJour(yyyyMmDd);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** Synthèse de la semaine civile (lun→dim) autour de `ref`. */
export function synthetiserSemaine(
  foyer: Foyer,
  ref = new Date().toISOString()
): SyntheseSemaine {
  const debut = lundiDe(ref);
  const fin = plusJours(debut, 6);
  const enfants = foyer.membres.filter(m => m.role === 'enfant' && m.actif);

  const parEnfant = enfants.map(e => {
    let minutesGagnees = 0;
    let minutesConsommees = 0;
    for (const m of foyer.mouvements) {
      if (m.enfantId !== e.id) continue;
      const j = jourParis(m.createdAt);
      if (j < debut || j > fin) continue;
      if (m.type === 'consommation') minutesConsommees += Math.abs(m.minutes);
      else minutesGagnees += m.minutes;
    }
    const validations = foyer.declarations.filter(
      d =>
        d.statut === 'validee' &&
        d.participants.includes(e.id) &&
        d.decidedAt &&
        jourParis(d.decidedAt) >= debut &&
        jourParis(d.decidedAt) <= fin
    ).length;
    return {
      enfantId: e.id,
      displayName: e.displayName,
      minutesGagnees,
      minutesConsommees,
      validations,
    };
  });

  return { debut, fin, parEnfant };
}
