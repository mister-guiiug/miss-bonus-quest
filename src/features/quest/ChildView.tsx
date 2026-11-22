import { useEffect, useState } from 'react';
import { Check, Clock, Sparkles, X } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import {
  jourParis,
  lireStreak,
  minutesGagneesJour,
  minutesPourActe,
  soldeMinutes,
} from './economy.ts';
import { messageErreur } from './errors.ts';
import { ActeIcon } from './icons.tsx';
import { prochainActe } from './next-act.ts';
import { SessionBar, StreakBadge } from './quest-ui.tsx';
import { useQuest, UNDO_MS } from './store.ts';
import type { Acte, StatutDeclaration } from './types.ts';
import { hapticLight, hapticSuccess } from './haptics.ts';
import { trackQuest } from './analytics-quest.ts';
import { playQuestSound } from './sound.ts';
import { synthetiserSemaine } from './weekly-summary.ts';

const MOTIFS = [
  'motifPasFini',
  'motifPasSoigne',
  'motifTropVite',
  'motifARefaire',
] as const;

export function ChildView() {
  const { t } = useI18n();
  const toast = useToast();
  const foyer = useQuest(s => s.foyer);
  const session = useQuest(s => s.session)!;
  const declarer = useQuest(s => s.declarer);
  const valider = useQuest(s => s.valider);
  const refuser = useQuest(s => s.refuser);
  const annulerDerniereValidation = useQuest(s => s.annulerDerniereValidation);
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
  const [motif, setMotif] = useState<Record<string, string>>({});

  const gagneesJour = minutesGagneesJour(foyer, membre.id, jourParis());
  const plafond = foyer.plafondMinutesJour ?? 0;
  const synthese = synthetiserSemaine(foyer);
  const gagneesSemaine = synthese.parEnfant.reduce(
    (acc, e) => acc + e.minutesGagnees,
    0
  );
  const objectif = foyer.objectifMinutesSemaine ?? 0;

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

  const elderPending =
    membre.peutValider === true
      ? foyer.declarations.filter(
          d =>
            d.statut === 'en_attente' &&
            d.declarePar !== membre.id &&
            !d.participants.includes(membre.id)
        )
      : [];

  useEffect(() => {
    if (!foyer.accentColor) return;
    document.documentElement.style.setProperty(
      '--quest-accent',
      foyer.accentColor
    );
  }, [foyer.accentColor]);

  useEffect(() => {
    const onFigee = () => {
      toast.show(t('quest.validationFigee'));
      trackQuest('validation_figee');
    };
    window.addEventListener('quest:validation-figee', onFigee);
    return () => window.removeEventListener('quest:validation-figee', onFigee);
  }, [toast, t]);

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
    if (err === 'plafond-jour') trackQuest('plafond_atteint');
    toast.show(messageErreur(err, t, t('quest.declared')));
  };

  const onValider = (declarationId: string) => {
    const err = valider(declarationId, membre.id);
    if (err) {
      if (err === 'plafond-jour') trackQuest('plafond_atteint');
      toast.show(messageErreur(err, t, t('quest.validated')));
      return;
    }
    hapticSuccess();
    playQuestSound('ok');
    trackQuest('valider', { role: 'aine' });
    const toastId = toast.show(t('quest.validated'), {
      duration: 0,
      action: {
        onAction: () => {
          annulerDerniereValidation();
          hapticLight();
          trackQuest('annuler_validation');
        },
      },
    });
    window.setTimeout(() => {
      if (toastId) toast.dismiss(toastId);
    }, UNDO_MS);
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
        {plafond > 0 ? (
          <div data-quest="plafond" style={{ marginTop: 'var(--spacing-2)' }}>
            <p data-quest="supporting">
              {t('quest.plafondProgress', {
                gagnees: gagneesJour,
                plafond,
              })}
            </p>
            <div
              role="progressbar"
              aria-valuenow={Math.min(gagneesJour, plafond)}
              aria-valuemin={0}
              aria-valuemax={plafond}
              style={{
                height: 8,
                borderRadius: 4,
                background: 'var(--color-border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (gagneesJour / plafond) * 100)}%`,
                  height: '100%',
                  background:
                    'var(--quest-accent, var(--color-accent, #2a9d8f))',
                }}
              />
            </div>
            {gagneesJour >= plafond * 0.8 ? (
              <p data-quest="supporting">{t('quest.plafondNear')}</p>
            ) : null}
          </div>
        ) : null}
        {objectif > 0 ? (
          <p data-quest="supporting" style={{ marginTop: 'var(--spacing-2)' }}>
            {t('quest.objectifProgress', {
              gagnees: gagneesSemaine,
              cible: objectif,
            })}
          </p>
        ) : null}
      </Card>

      {next ? (
        <div
          data-quest="next"
          style={{
            position: 'sticky',
            top: 'var(--spacing-2)',
            zIndex: 2,
            background: 'var(--color-background-surface)',
            borderLeft:
              '4px solid var(--quest-accent, var(--color-accent, #2a9d8f))',
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-element)',
            boxShadow: '0 1px 0 var(--color-border)',
          }}
        >
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

      {membre.peutValider && elderPending.length > 0 ? (
        <Card>
          <CardHeader title={t('quest.elderInbox')} />
          <p data-quest="supporting">{t('quest.elderHint')}</p>
          <ul data-quest="list">
            {elderPending.map(d => {
              const acte = foyer.actes.find(a => a.id === d.acteId);
              const qui = d.participants
                .map(id => foyer.membres.find(m => m.id === id)?.displayName)
                .filter(Boolean)
                .join(', ');
              return (
                <li key={d.id} data-quest="acte">
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    {acte?.titre}
                  </p>
                  <p data-quest="supporting">{qui}</p>
                  <div data-quest="row" style={{ flexWrap: 'wrap' }}>
                    {MOTIFS.map(key => (
                      <Button
                        key={key}
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setMotif(prev => ({
                            ...prev,
                            [d.id]: t(`quest.${key}`),
                          }))
                        }
                      >
                        {t(`quest.${key}`)}
                      </Button>
                    ))}
                  </div>
                  <TextField
                    label={t('quest.refuseReason')}
                    value={motif[d.id] ?? ''}
                    onChange={e =>
                      setMotif(prev => ({ ...prev, [d.id]: e.target.value }))
                    }
                  />
                  <div
                    data-quest="row"
                    style={{ marginTop: 'var(--spacing-2)' }}
                  >
                    <Button size="sm" onClick={() => onValider(d.id)}>
                      <Check aria-hidden className="size-4" />
                      {t('quest.validate')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const err = refuser(d.id, membre.id, motif[d.id]);
                        toast.show(messageErreur(err, t, t('quest.refused')));
                      }}
                    >
                      <X aria-hidden className="size-4" />
                      {t('quest.refuse')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
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
