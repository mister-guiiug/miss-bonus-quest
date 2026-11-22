import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../i18n/index.ts';
import { enfilerPush } from './sync.ts';
import { useQuest } from './store.ts';

/** Bannière de conflit updatedAt — garder local ou prendre le cloud. */
export function ConflictBanner() {
  const { t } = useI18n();
  const conflict = useQuest(s => s.conflict);
  const foyer = useQuest(s => s.foyer);
  const resoudreConflit = useQuest(s => s.resoudreConflit);

  if (!conflict) return null;

  return (
    <div data-quest="auth-callout" role="alert">
      <p data-quest="label">{t('quest.conflictTitle')}</p>
      <p data-quest="supporting">
        {t('quest.conflictBody', {
          local: new Date(foyer.updatedAt).toLocaleString(),
          cloud: new Date(conflict.updatedAt).toLocaleString(),
        })}
      </p>
      <div data-quest="row">
        <Button
          size="sm"
          onClick={() => {
            resoudreConflit('local');
            enfilerPush(useQuest.getState().foyer);
          }}
        >
          {t('quest.conflictKeepLocal')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => resoudreConflit('cloud')}
        >
          {t('quest.conflictTakeCloud')}
        </Button>
      </div>
    </div>
  );
}
