const ERREURS_FR: Record<string, string> = {
  'session-enfant-requise': 'Choisis un profil enfant pour déclarer.',
  'acte-inconnu': 'Acte introuvable ou désactivé.',
  'deja-en-attente': 'Tu as déjà une déclaration en attente pour cet acte.',
  'parent-inconnu': 'Profil parent requis.',
  'declaration-inconnue': 'Déclaration introuvable.',
  'deja-decidee': 'Cette déclaration a déjà été traitée.',
  'enfants-requis': 'Choisis au moins un enfant.',
  'minutes-invalides': 'Indique un nombre de minutes positif.',
  'enfant-inconnu': 'Enfant introuvable.',
  'solde-vide': 'Plus de minutes à consommer.',
};

export function messageErreur(code: string | null, fallback: string): string {
  if (!code) return fallback;
  return ERREURS_FR[code] ?? fallback;
}
