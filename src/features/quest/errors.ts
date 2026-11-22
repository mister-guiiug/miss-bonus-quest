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
  'taux-invalide': 'Le taux points → minutes est invalide.',
  'nom-requis': 'Indique un prénom.',
  'membre-inconnu': 'Membre introuvable.',
  'soi-interdit': 'Tu ne peux pas te retirer toi-même.',
  'dernier-parent': 'Il doit rester au moins un parent actif.',
  'titre-requis': 'Le titre de l’acte est obligatoire.',
  'recompense-invalide': 'Points et minutes doivent être ≥ 0.',
  'code-invalide': 'Code inconnu. Demande-le à un parent.',
  'sync-indisponible': 'Sync distante indisponible (Supabase non configuré).',
  'sync-echec': 'La synchronisation a échoué.',
};

export function messageErreur(code: string | null, fallback: string): string {
  if (!code) return fallback;
  return ERREURS_FR[code] ?? fallback;
}
