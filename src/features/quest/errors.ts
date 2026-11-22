/** Codes métier → clés i18n `quest.errors.*`. */
const ERROR_KEYS: Record<string, string> = {
  'session-enfant-requise': 'quest.errors.sessionEnfantRequise',
  'acte-inconnu': 'quest.errors.acteInconnu',
  'deja-en-attente': 'quest.errors.dejaEnAttente',
  'parent-inconnu': 'quest.errors.parentInconnu',
  'declaration-inconnue': 'quest.errors.declarationInconnue',
  'deja-decidee': 'quest.errors.dejaDecidee',
  'enfants-requis': 'quest.errors.enfantsRequis',
  'minutes-invalides': 'quest.errors.minutesInvalides',
  'enfant-inconnu': 'quest.errors.enfantInconnu',
  'solde-vide': 'quest.errors.soldeVide',
  'taux-invalide': 'quest.errors.tauxInvalide',
  'nom-requis': 'quest.errors.nomRequis',
  'membre-inconnu': 'quest.errors.membreInconnu',
  'soi-interdit': 'quest.errors.soiInterdit',
  'dernier-parent': 'quest.errors.dernierParent',
  'titre-requis': 'quest.errors.titreRequis',
  'recompense-invalide': 'quest.errors.recompenseInvalide',
  'code-invalide': 'quest.errors.codeInvalide',
  'sync-indisponible': 'quest.errors.syncIndisponible',
  'sync-echec': 'quest.errors.syncEchec',
  'sync-rate-limit': 'quest.errors.syncRateLimit',
  'pas-proprietaire': 'quest.errors.pasProprietaire',
  'owner-sans-auth': 'quest.errors.ownerSansAuth',
  'lecture-seule': 'quest.errors.lectureSeule',
  'plafond-jour': 'quest.errors.plafondJour',
  'pin-invalide': 'quest.errors.pinInvalide',
};

/**
 * Résout un code métier via i18n. Sans code, rend le libellé de succès passé.
 * `t` est volontairement large : le typage strict des chemins i18n ne passe
 * pas une clé construite dynamiquement.
 */
export function messageErreur(
  code: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- clé dynamique
  t: (key: any) => string,
  fallback: string
): string {
  if (!code) return fallback;
  const key = ERROR_KEYS[code];
  if (!key) return fallback;
  const msg = t(key);
  return msg === key ? fallback : msg;
}
