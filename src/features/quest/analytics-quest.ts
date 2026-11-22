import {
  GESTES,
  trackEvent,
} from '@mister-guiiug/dev-pwa-config/analytics';

/** Événements métier — noms stables, jamais d’identifiant personnel. */
export function trackQuest(
  action: string,
  props?: Record<string, unknown>
): void {
  trackEvent(GESTES.OPERATION, { domaine: 'quest', action, ...props });
}
