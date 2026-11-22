import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Star } from 'lucide-react';
import { useI18n } from '../../i18n/index.ts';
import { AvatarInitiales } from './AvatarInitiales.tsx';
import { useQuest } from './store.ts';
import type { Membre } from './types.ts';

export function SessionBar({ membre }: { membre: Membre }) {
  const { t } = useI18n();
  const quitterSession = useQuest(s => s.quitterSession);
  return (
    <div data-quest="session">
      <p data-quest="label" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
        <AvatarInitiales name={membre.displayName} />
        {t('quest.hello', { name: membre.displayName })}
      </p>
      <Button variant="ghost" size="sm" onClick={quitterSession}>
        {t('quest.switch')}
      </Button>
    </div>
  );
}

export function StreakBadge({
  jours,
  requis,
}: {
  jours: number;
  requis: number;
}) {
  const { t } = useI18n();
  return (
    <span data-quest="streak">
      <Star aria-hidden className="size-3" />
      {t('quest.streakProgress', { jours, requis })}
    </span>
  );
}
