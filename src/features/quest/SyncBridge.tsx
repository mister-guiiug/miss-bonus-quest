import { useEffect, useRef } from 'react';
import { useAuthContext } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import {
  ecouterFoyer,
  enfilerPush,
  foyerPushQueue,
  syncDisponible,
  tirerFoyer,
} from './sync.ts';
import { useQuest } from './store.ts';

/**
 * Pont auth ↔ sync foyer (ADR 0015).
 *
 * - À la connexion parent : tire, puis démarre la file hors-ligne.
 * - À chaque `updatedAt` local : enfile un push (fusionné par id).
 * - Realtime : applique le distant sauf conflit `updatedAt` local plus récent.
 */
export function SyncBridge() {
  const { t } = useI18n();
  const toast = useToast();
  const { signedIn, ready } = useAuthContext();
  const foyer = useQuest(s => s.foyer);
  const lastPushedAt = useRef<string | null>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!ready || !signedIn || !syncDisponible()) {
      bootstrapped.current = false;
      return;
    }
    let cancelled = false;
    const foyerId = foyer.id;
    void (async () => {
      const distant = await tirerFoyer(foyerId);
      if (cancelled) return;
      if (typeof distant !== 'string') {
        const result = useQuest.getState().appliquerFoyerDistant(distant);
        if (result === 'conflit') {
          toast.show(t('quest.syncConflict'));
          enfilerPush(useQuest.getState().foyer);
        }
      }
      bootstrapped.current = true;
      await foyerPushQueue().start();
    })();
    return () => {
      cancelled = true;
      foyerPushQueue().stop();
    };
  }, [ready, signedIn, foyer.id, toast, t]);

  useEffect(() => {
    if (!signedIn || !syncDisponible() || !bootstrapped.current) return;
    if (!foyer.updatedAt || foyer.updatedAt === lastPushedAt.current) return;
    lastPushedAt.current = foyer.updatedAt;
    enfilerPush(foyer);
  }, [signedIn, foyer, foyer.updatedAt]);

  useEffect(() => {
    if (!signedIn || !syncDisponible()) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void ecouterFoyer(foyer.id, distant => {
      if (cancelled) return;
      const result = useQuest.getState().appliquerFoyerDistant(distant);
      if (result === 'conflit') {
        toast.show(t('quest.syncConflict'));
        return;
      }
      lastPushedAt.current = distant.updatedAt ?? lastPushedAt.current;
    }).then(channel => {
      if (!channel || cancelled) {
        channel?.stop();
        return;
      }
      stop = () => channel.stop();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [signedIn, foyer.id, toast, t]);

  return null;
}
