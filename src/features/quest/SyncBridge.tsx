import { useEffect, useRef } from 'react';
import { useAuthContext } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { ConflictBanner } from './ConflictBanner.tsx';
import {
  ecouterFoyer,
  enfilerPush,
  foyerPushQueue,
  rejoindreCoparent,
  rejoindreParCode,
  syncDisponible,
  tirerFoyer,
} from './sync.ts';
import { useQuest } from './store.ts';

const CHILD_POLL_MS = 45_000;

/**
 * Pont auth ↔ sync foyer (ADR 0015 / 0016).
 */
export function SyncBridge() {
  const { t } = useI18n();
  const toast = useToast();
  const { signedIn, ready, user } = useAuthContext<
    { id?: string },
    { id?: string }
  >();
  const foyer = useQuest(s => s.foyer);
  const session = useQuest(s => s.session);
  const lastPushedAt = useRef<string | null>(null);
  const bootstrapped = useRef(false);

  // Lie le compte au parent local dès la connexion.
  useEffect(() => {
    if (!ready || !signedIn || !user?.id) return;
    const authId = user.id;
    const state = useQuest.getState();
    if (state.session?.role === 'parent') {
      state.lierCompteParent(authId, state.session.membreId);
    } else if (!state.foyer.ownerAuthId) {
      const parent = state.foyer.membres.find(
        m => m.role === 'parent' && m.actif
      );
      if (parent) state.lierCompteParent(authId, parent.id);
    }
  }, [ready, signedIn, user?.id]);

  // Bootstrap parent connecté.
  useEffect(() => {
    if (!ready || !signedIn || !syncDisponible()) {
      bootstrapped.current = false;
      return;
    }
    let cancelled = false;
    const foyerId = foyer.id;
    const codeInvite = session?.codeInvite;
    void (async () => {
      if (codeInvite && session?.role === 'parent') {
        const joined = await rejoindreCoparent(codeInvite);
        if (!cancelled && typeof joined !== 'string') {
          useQuest.getState().appliquerFoyerDistant(joined, { force: true });
        }
      }
      const distant = await tirerFoyer(useQuest.getState().foyer.id || foyerId);
      if (cancelled) return;
      if (typeof distant !== 'string') {
        const result = useQuest.getState().appliquerFoyerDistant(distant);
        if (result === 'conflit') {
          useQuest.getState().setConflict(distant);
          toast.show(t('quest.syncConflict'));
        }
      }
      bootstrapped.current = true;
      await foyerPushQueue().start();
    })();
    return () => {
      cancelled = true;
      foyerPushQueue().stop();
    };
  }, [ready, signedIn, foyer.id, session?.codeInvite, session?.role, toast, t]);

  // Push auto.
  useEffect(() => {
    if (!signedIn || !syncDisponible() || !bootstrapped.current) return;
    if (!foyer.updatedAt || foyer.updatedAt === lastPushedAt.current) return;
    lastPushedAt.current = foyer.updatedAt;
    enfilerPush(foyer);
  }, [signedIn, foyer, foyer.updatedAt]);

  // Realtime parent.
  useEffect(() => {
    if (!signedIn || !syncDisponible()) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void ecouterFoyer(foyer.id, distant => {
      if (cancelled) return;
      const result = useQuest.getState().appliquerFoyerDistant(distant);
      if (result === 'conflit') {
        useQuest.getState().setConflict(distant);
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
  }, [signedIn, foyer.id]);

  // Pull enfant / co-parent sans compte : focus + intervalle.
  useEffect(() => {
    const code = session?.codeInvite;
    if (!code || !syncDisponible()) return;
    if (signedIn && session?.role === 'parent') return;

    const pull = () => {
      void rejoindreParCode(code).then(res => {
        if (typeof res === 'string') return;
        const result = useQuest.getState().appliquerFoyerDistant(res);
        if (result === 'conflit') useQuest.getState().setConflict(res);
      });
    };

    pull();
    const id = window.setInterval(pull, CHILD_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') pull();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [session?.codeInvite, session?.role, signedIn]);

  return <ConflictBanner />;
}
