import { lazy, Suspense, useEffect } from 'react';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { useIdlePrefetch } from '@mister-guiiug/dev-pwa-config/react/use-prefetch';
import { useI18n } from '../../i18n/index.ts';
import { REPO_URL } from '../../app/links.ts';
import { SyncBridge } from './SyncBridge.tsx';
import { RoleGate } from './RoleGate.tsx';
import { useQuest } from './store.ts';

/** Thunks nommés — partagés entre `lazy()` et `useIdlePrefetch` (pwa-doctor). */
const loadChildView = () => import('./ChildView.tsx');
const loadParentView = () => import('./ParentView.tsx');

const ChildView = lazy(async () => {
  const m = await loadChildView();
  return { default: m.ChildView };
});
const ParentView = lazy(async () => {
  const m = await loadParentView();
  return { default: m.ParentView };
});

const IS_TEST = import.meta.env.MODE === 'test';

export function HomeScreen() {
  const { t } = useI18n();
  const load = useQuest(s => s.load);
  const ready = useQuest(s => s.ready);
  const session = useQuest(s => s.session);

  // Précharge hors Vitest : sinon l’import lazy finit après le teardown
  // (App.nav.test → EnvironmentTeardownError sur icons.tsx).
  useIdlePrefetch(loadChildView, { timeout: 0, enabled: !IS_TEST });
  useIdlePrefetch(loadParentView, { timeout: 0, enabled: !IS_TEST });

  useEffect(() => {
    load();
    if (IS_TEST) return;
    void loadChildView();
    void loadParentView();
  }, [load]);

  // Hook e2e : `/?e2e=conflict` pose un conflit après chargement.
  useEffect(() => {
    if (IS_TEST || !ready) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('e2e') !== 'conflict') return;
    const { foyer, setConflict } = useQuest.getState();
    setConflict({
      ...foyer,
      nom: 'Cloud',
      updatedAt: new Date(0).toISOString(),
    });
  }, [ready]);

  if (!ready) {
    return <p data-quest="hint">{t('quest.loading')}</p>;
  }

  return (
    <div data-quest="screen">
      <SyncBridge />
      <p data-quest="hint">{t('app.tagline')}</p>

      {!session ? <RoleGate /> : null}
      <Suspense fallback={<p data-quest="hint">{t('quest.loading')}</p>}>
        {session?.role === 'enfant' ? <ChildView /> : null}
        {session?.role === 'parent' ? <ParentView /> : null}
      </Suspense>

      <AppFooter repoUrl={REPO_URL} issues />
    </div>
  );
}
