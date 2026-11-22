import type { SyntheseSemaine } from './weekly-summary.ts';

/** Texte partageable de la synthèse semaine. */
export function texteSyntheseSemaine(
  s: SyntheseSemaine,
  foyerNom: string
): string {
  const lignes = [
    `Miss Bonus Quest — ${foyerNom}`,
    `Semaine ${s.debut} → ${s.fin}`,
    '',
    ...s.parEnfant.map(
      e =>
        `${e.displayName}: +${e.minutesGagnees} min / −${e.minutesConsommees} min · ${e.validations} validation(s)`
    ),
  ];
  return lignes.join('\n');
}

/** Télécharge un fichier texte (pas de PDF — coût / dépendances). */
export function telechargerSynthese(texte: string, nom = 'semaine.txt'): void {
  const blob = new Blob([texte], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}
