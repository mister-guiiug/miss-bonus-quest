import { useState } from 'react';
import { Check, Clock, Sparkles, X } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { lireStreak, minutesPourActe, soldeMinutes } from './economy.ts';
import { messageErreur } from './errors.ts';
import { ActeIcon } from './icons.tsx';
import { prochainActe } from './next-act.ts';
import { SessionBar, StreakBadge } from './quest-ui.tsx';
import { useQuest } from './store.ts';
import type { Acte, StatutDeclaration } from './types.ts';
import { hapticLight } from './haptics.ts';
import { trackQuest } from './analytics-quest.ts';
import { playQuestSound } from './sound.ts';

export function ChildView() {
  const { t } = useI18n();
  const toast = useToast();
  const foyer = useQuest(s => s.foyer);
  const session = useQuest(s => s.session)!;
  const declarer = useQuest(s => s.declarer);
  const membre = foyer.membres.find(m => m.id === session.membreId)!;
  const solde = soldeMinutes(foyer, membre.id);
  const next = prochainActe(foyer, membre.id);
  const actes = foyer.actes
    .filter(a => a.actif)
    .sort((a, b) => a.ordre - b.ordre);
  const enfants = foyer.membres.filter(m => m.role === 'enfant' && m.actif);
  const [collectifPour, setCollectifPour] = useState<Record<string, string[]>>(
    {}
  );
  const [filtre, setFiltre] = useState<'tous' | StatutDeclaration>('tous');

  const historiques = foyer.declarations.filter(
    d =>
      (d.declarePar === membre.id || d.participants.includes(membre.id)) &&
      (filtre === 'tous' || d.statut === filtre)
  );
  const carnet = foyer.mouvements
    .filter(m => m.enfantId === membre.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 15);

  const onDeclare = (acte: Acte) => {
    const parts =
      acte.portee === 'collectif'
        ? (collectifPour[acte.id] ?? [membre.id])
        : [membre.id];
    const err = declarer(acte.id, parts);
    if (!err) {
      hapticLight();
      playQuestSound('soft');
      trackQuest('declarer', { portee: acte.portee });
    }
    toast.show(messageErreur(err, t, t('quest.declared')));
  };

  return (
    <div data-quest="stack">
      <SessionBar membre={membre} />

      <Card>
        <CardHeader title={t('quest.balance')} />
        <p data-quest="balance">
          <Sparkles aria-hidden className="size-6" />
          {t('quest.minutes', { count: solde })}
        </p>
      </Card>

      {next ? (
        <div data-quest="next">
          <p data-quest="label">{t('quest.nextActTitle')}</p>
          <strong>{next.acte.titre}</strong>
          <p data-quest="supporting">
            {t('quest.nextActHint', { min: next.minutes })}
          </p>
          {next.streakRequis ? (
            <StreakBadge jours={next.streakJours} requis={next.streakRequis} />
          ) : null}
          <div data-quest="row" style={{ marginTop: 'var(--spacing-2)' }}>
            <Button size="sm" onClick={() => onDeclare(next.acte)}>
              {t('quest.declare')}
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader title={t('quest.catalogue')} />
        <ul data-quest="actes">
          {actes.map(acte => {
            const reward = minutesPourActe(
              acte,
              foyer.pointsTaux,
              foyer.minutesTaux
            );
            const streak = lireStreak(foyer, membre.id, acte.id);
            const selected = collectifPour[acte.id] ?? [membre.id];
            return (
              <li key={acte.id} data-quest="acte">
                <div
                  data-quest="row"
                  style={{ justifyContent: 'space-between' }}
                >
                  <div data-quest="stack" style={{ gap: 'var(--spacing-1)' }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 'var(--font-weight-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                      }}
                    >
                      <ActeIcon name={acte.icone} />
                      {acte.titre}
                    </p>
                    <p data-quest="supporting">
                      {acte.description} ·{' '}
                      {t('quest.reward', { min: reward.minutes })}
                    </p>
                    {acte.streak ? (
                      <StreakBadge
                        jours={streak.jours}
                        requis={acte.streak.joursRequis}
                      />
                    ) : null}
                  </div>
                  <Button size="sm" onClick={() => onDeclare(acte)}>
                    {t('quest.declare')}
                  </Button>
                </div>
                {acte.portee === 'collectif' ? (
                  <div
                    data-quest="row"
                    style={{ marginTop: 'var(--spacing-2)' }}
                  >
                    {enfants.map(e => {
                      const on = selected.includes(e.id);
                      return (
                        <Button
                          key={e.id}
                          size="sm"
                          variant={on ? 'primary' : 'outline'}
                          onClick={() =>
                            setCollectifPour(prev => {
                              const cur = prev[acte.id] ?? [membre.id];
                              const nextIds = on
                                ? cur.filter(id => id !== e.id)
                                : [...cur, e.id];
                              return {
                                ...prev,
                                [acte.id]:
                                  nextIds.length > 0 ? nextIds : [membre.id],
                              };
                            })
                          }
                        >
                          {e.displayName}
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title={t('quest.history')} />
        <div data-quest="row" style={{ marginBottom: 'var(--spacing-3)' }}>
          {(
            [
              ['tous', t('quest.filterAll')],
              ['en_attente', t('quest.status.en_attente')],
              ['validee', t('quest.status.validee')],
              ['refusee', t('quest.status.refusee')],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={filtre === key ? 'primary' : 'outline'}
              onClick={() => setFiltre(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        {historiques.length === 0 ? (
          <EmptyState title={t('quest.historyEmpty')} />
        ) : (
          <ul data-quest="list">
            {historiques.slice(0, 20).map(d => {
              const acte = foyer.actes.find(a => a.id === d.acteId);
              return (
                <li key={d.id}>
                  <div
                    data-quest="row"
                    style={{ justifyContent: 'space-between' }}
                  >
                    <span>{acte?.titre ?? d.acteId}</span>
                    <span data-quest="row">
                      {d.statut === 'en_attente' ? (
                        <Clock className="size-3.5" />
                      ) : null}
                      {d.statut === 'validee' ? (
                        <Check className="size-3.5" />
                      ) : null}
                      {d.statut === 'refusee' ? (
                        <X className="size-3.5" />
                      ) : null}
                      {t(`quest.status.${d.statut}`)}
                    </span>
                  </div>
                  {d.statut === 'refusee' && d.motifRefus ? (
                    <span data-quest="supporting">{d.motifRefus}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title={t('quest.ledger')} />
        {carnet.length === 0 ? (
          <EmptyState title={t('quest.ledgerEmpty')} />
        ) : (
          <ul data-quest="list">
            {carnet.map(m => (
              <li
                key={m.id}
                data-quest="row"
                style={{ justifyContent: 'space-between' }}
              >
                <span data-quest="supporting">
                  {t(`quest.mouvement.${m.type}`)}
                </span>
                <strong>
                  {m.minutes > 0 ? '+' : ''}
                  {t('quest.minutes', { count: m.minutes })}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
