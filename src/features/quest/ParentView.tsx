import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useAuthContext } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { useI18n } from '../../i18n/index.ts';
import { soldeMinutes } from './economy.ts';
import { messageErreur } from './errors.ts';
import { ActeIcon } from './icons.tsx';
import { QrCodeInvite } from './QrCodeInvite.tsx';
import { SessionBar, StreakBadge } from './quest-ui.tsx';
import {
  pousserFoyer,
  syncDisponible,
  tirerFoyer,
  transfererPropriete,
} from './sync.ts';
import { useQuest, type ActeBrouillon } from './store.ts';
import type { Acte, StreakConfig } from './types.ts';
import { synthetiserSemaine } from './weekly-summary.ts';
import { AvatarInitiales } from './AvatarInitiales.tsx';
import { hapticLight, hapticSuccess } from './haptics.ts';
import { trackQuest } from './analytics-quest.ts';
import { UNDO_MS } from './store.ts';
import { partagerInvitation } from './invite-share.ts';
import { telechargerSynthese, texteSyntheseSemaine } from './week-export.ts';
import { playQuestSound } from './sound.ts';
import { setSonActive, sonActive } from './prefs.ts';

const BROUILLON_VIDE: ActeBrouillon = {
  titre: '',
  description: '',
  icone: null,
  portee: 'perso',
  points: 10,
  minutesDirectes: 0,
  streak: null,
  actif: true,
};

type ParentTab = 'inbox' | 'actions' | 'foyer' | 'actes' | 'history';
const AVATAR_COLORS = ['#c4ddd8', '#f0d9b5', '#d4c4e8', '#f5c6c6', '#c9d4f0'];
const AVATAR_EMOJIS = ['🦊', '🐼', '🦁', '🐸', '🦄', '🐯'];

function AuthSyncCallout() {
  const { t } = useI18n();
  const { signedIn, ready } = useAuthContext();
  if (!syncDisponible()) {
    return <p data-quest="supporting">{t('quest.syncLocalOnly')}</p>;
  }
  if (!ready) return null;
  if (signedIn) {
    return <p data-quest="supporting">{t('quest.syncLive')}</p>;
  }
  return (
    <div data-quest="auth-callout">
      <p data-quest="label">{t('quest.authCalloutTitle')}</p>
      <p data-quest="supporting">{t('quest.authCalloutBody')}</p>
      <Link to="/compte">
        <Button size="sm" variant="outline">
          {t('quest.authCalloutCta')}
        </Button>
      </Link>
    </div>
  );
}

function StreakFields({
  streak,
  onChange,
}: {
  streak: StreakConfig | null;
  onChange: (s: StreakConfig | null) => void;
}) {
  const { t } = useI18n();
  if (!streak) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onChange({ joursRequis: 7, bonusPoints: 20, bonusMinutes: 5 })
        }
      >
        {t('quest.streakEnable')}
      </Button>
    );
  }
  return (
    <div data-quest="stack">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 'var(--spacing-2)',
        }}
      >
        <TextField
          label={t('quest.streakDays')}
          type="number"
          value={String(streak.joursRequis)}
          onChange={e =>
            onChange({
              ...streak,
              joursRequis: Math.max(1, Number(e.target.value) || 1),
            })
          }
        />
        <TextField
          label={t('quest.streakBonusPts')}
          type="number"
          value={String(streak.bonusPoints)}
          onChange={e =>
            onChange({
              ...streak,
              bonusPoints: Math.max(0, Number(e.target.value) || 0),
            })
          }
        />
        <TextField
          label={t('quest.streakBonusMin')}
          type="number"
          value={String(streak.bonusMinutes)}
          onChange={e =>
            onChange({
              ...streak,
              bonusMinutes: Math.max(0, Number(e.target.value) || 0),
            })
          }
        />
      </div>
      <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
        {t('quest.streakDisable')}
      </Button>
    </div>
  );
}

export function ParentView() {
  const { t } = useI18n();
  const toast = useToast();
  const foyer = useQuest(s => s.foyer);
  const session = useQuest(s => s.session)!;
  const valider = useQuest(s => s.valider);
  const annulerDerniereValidation = useQuest(s => s.annulerDerniereValidation);
  const transfererOwner = useQuest(s => s.transfererOwner);
  const refuser = useQuest(s => s.refuser);
  const creditManuel = useQuest(s => s.creditManuel);
  const consommer = useQuest(s => s.consommer);
  const majFoyer = useQuest(s => s.majFoyer);
  const regenererCode = useQuest(s => s.regenererCode);
  const ajouterMembre = useQuest(s => s.ajouterMembre);
  const retirerMembre = useQuest(s => s.retirerMembre);
  const upsertActe = useQuest(s => s.upsertActe);
  const setActeActif = useQuest(s => s.setActeActif);
  const appliquerFoyerDistant = useQuest(s => s.appliquerFoyerDistant);
  const definirPin = useQuest(s => s.definirPin);
  const majAvatar = useQuest(s => s.majAvatar);
  const lectureSeule = session.lectureSeule === true;
  const membre = foyer.membres.find(m => m.id === session.membreId)!;
  const enfants = foyer.membres.filter(m => m.role === 'enfant' && m.actif);
  const parents = foyer.membres.filter(m => m.role === 'parent' && m.actif);
  const pending = foyer.declarations.filter(d => d.statut === 'en_attente');
  const actes = [...foyer.actes].sort((a, b) => a.ordre - b.ordre);
  const [creditActe, setCreditActe] = useState(
    actes.find(a => a.actif)?.id ?? ''
  );
  const [creditEnfant, setCreditEnfant] = useState(enfants[0]?.id ?? '');
  const [consoEnfant, setConsoEnfant] = useState(enfants[0]?.id ?? '');
  const [consoMin, setConsoMin] = useState(10);
  const [motif, setMotif] = useState<Record<string, string>>({});
  const [nomFoyer, setNomFoyer] = useState(foyer.nom);
  const [pts, setPts] = useState(String(foyer.pointsTaux));
  const [mins, setMins] = useState(String(foyer.minutesTaux));
  const [nouvelEnfant, setNouvelEnfant] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<ActeBrouillon>(BROUILLON_VIDE);
  const [onglet, setOnglet] = useState<ParentTab>('inbox');
  const [plafond, setPlafond] = useState(String(foyer.plafondMinutesJour ?? 0));
  const [pinDraft, setPinDraft] = useState<Record<string, string>>({});
  const [histFiltre, setHistFiltre] = useState<
    'tous' | 'validee' | 'refusee' | 'en_attente'
  >('tous');
  const [soundOn, setSoundOn] = useState(() => sonActive());

  const soldes = enfants.map(e => ({
    id: e.id,
    name: e.displayName,
    minutes: soldeMinutes(foyer, e.id),
    membre: e,
  }));
  const synthese = useMemo(() => synthetiserSemaine(foyer), [foyer]);
  const coParents = parents.filter(
    p => p.id !== membre.id && p.authUserId && p.actif
  );
  const historique = foyer.declarations
    .filter(d => histFiltre === 'tous' || d.statut === histFiltre)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);

  const chargerActe = (a: Acte) => {
    setEditId(a.id);
    setBrouillon({
      titre: a.titre,
      description: a.description,
      icone: a.icone ?? null,
      portee: a.portee,
      points: a.points,
      minutesDirectes: a.minutesDirectes,
      streak: a.streak,
      actif: a.actif,
    });
    setOnglet('actes');
  };

  const tabs: { id: ParentTab; label: string }[] = [
    {
      id: 'inbox',
      label: `${t('quest.tabInbox')}${pending.length ? ` (${pending.length})` : ''}`,
    },
    { id: 'actions', label: t('quest.tabActions') },
    { id: 'history', label: t('quest.tabHistory') },
    { id: 'foyer', label: t('quest.tabFoyer') },
    { id: 'actes', label: t('quest.tabActs') },
  ];

  return (
    <div data-quest="stack">
      <SessionBar membre={membre} />

      <Card>
        <CardHeader
          title={t('quest.parentBoard')}
          subtitle={t('quest.taux', {
            pts: foyer.pointsTaux,
            min: foyer.minutesTaux,
          })}
        />
        <ul data-quest="soldes">
          {soldes.map(s => (
            <li
              key={s.id}
              data-quest="row"
              style={{ justifyContent: 'space-between' }}
            >
              <span
                style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}
              >
                <AvatarInitiales membre={s.membre} size={24} />
                {s.name}
              </span>
              <strong>{t('quest.minutes', { count: s.minutes })}</strong>
            </li>
          ))}
        </ul>
        <div data-quest="week" style={{ marginTop: 'var(--spacing-3)' }}>
          <p data-quest="label">{t('quest.weekTitle')}</p>
          <p data-quest="supporting">
            {t('quest.weekRange', { debut: synthese.debut, fin: synthese.fin })}
          </p>
          <ul data-quest="week-list">
            {synthese.parEnfant.map(e => (
              <li key={e.enfantId} data-quest="supporting">
                {e.displayName} · +{e.minutesGagnees} / −{e.minutesConsommees}{' '}
                min · {t('quest.weekValidations', { count: e.validations })}
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              telechargerSynthese(
                texteSyntheseSemaine(synthese, foyer.nom),
                `semaine-${synthese.debut}.txt`
              );
              toast.show(t('quest.weekExported'));
            }}
          >
            {t('quest.weekExport')}
          </Button>
        </div>
        <AuthSyncCallout />
        {syncDisponible() ? (
          <div data-quest="row" style={{ marginTop: 'var(--spacing-3)' }}>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void pousserFoyer(foyer).then(err =>
                  toast.show(messageErreur(err, t, t('quest.syncPushed')))
                )
              }
            >
              {t('quest.syncPush')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void tirerFoyer(foyer.id).then(res => {
                  if (typeof res === 'string') {
                    toast.show(messageErreur(res, t, t('quest.syncFailed')));
                    return;
                  }
                  const r = appliquerFoyerDistant(res);
                  if (r === 'conflit') {
                    useQuest.getState().setConflict(res);
                  }
                  toast.show(
                    r === 'conflit'
                      ? t('quest.syncConflict')
                      : t('quest.syncPulled')
                  );
                })
              }
            >
              {t('quest.syncPull')}
            </Button>
          </div>
        ) : null}
      </Card>

      <div data-quest="row" role="tablist" aria-label={t('quest.parentTabs')}>
        {tabs.map(tab => (
          <Button
            key={tab.id}
            size="sm"
            variant={onglet === tab.id ? 'primary' : 'outline'}
            onClick={() => setOnglet(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {onglet === 'history' ? (
        <Card>
          <CardHeader title={t('quest.tabHistory')} />
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
                variant={histFiltre === key ? 'primary' : 'outline'}
                onClick={() => setHistFiltre(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          {historique.length === 0 ? (
            <EmptyState title={t('quest.historyEmpty')} />
          ) : (
            <ul data-quest="list">
              {historique.map(d => {
                const acte = foyer.actes.find(a => a.id === d.acteId);
                return (
                  <li key={d.id}>
                    <div
                      data-quest="row"
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span>{acte?.titre ?? d.acteId}</span>
                      <span data-quest="supporting">
                        {t(`quest.status.${d.statut}`)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {onglet === 'inbox' && !lectureSeule ? (
        <Card>
          <CardHeader title={t('quest.inbox')} />
          {pending.length === 0 ? (
            <EmptyState title={t('quest.inboxEmpty')} />
          ) : (
            <ul data-quest="list">
              {pending.map(d => {
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
                      <Button
                        size="sm"
                        onClick={() => {
                          const err = valider(d.id, membre.id);
                          if (err) {
                            toast.show(
                              messageErreur(err, t, t('quest.validated'))
                            );
                            return;
                          }
                          hapticSuccess();
                          playQuestSound('ok');
                          trackQuest('valider');
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
                        }}
                      >
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
          )}
        </Card>
      ) : null}

      {onglet === 'actions' && !lectureSeule ? (
        <>
          <Card>
            <CardHeader title={t('quest.manualCredit')} />
            <div data-quest="stack">
              <label data-quest="label">
                {t('quest.acte')}
                <select
                  value={creditActe}
                  onChange={e => setCreditActe(e.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 'var(--spacing-1)',
                    padding: 'var(--spacing-2)',
                    borderRadius: 'var(--radius-element)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background-surface)',
                  }}
                >
                  {actes
                    .filter(a => a.actif)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.titre}
                      </option>
                    ))}
                </select>
              </label>
              <label data-quest="label">
                {t('quest.enfant')}
                <select
                  value={creditEnfant}
                  onChange={e => setCreditEnfant(e.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 'var(--spacing-1)',
                    padding: 'var(--spacing-2)',
                    borderRadius: 'var(--radius-element)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background-surface)',
                  }}
                >
                  {enfants.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                onClick={() => {
                  const err = creditManuel(
                    creditActe,
                    [creditEnfant],
                    membre.id
                  );
                  toast.show(messageErreur(err, t, t('quest.credited')));
                }}
              >
                {t('quest.credit')}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('quest.consume')} />
            <div data-quest="stack">
              <label data-quest="label">
                {t('quest.enfant')}
                <select
                  value={consoEnfant}
                  onChange={e => setConsoEnfant(e.target.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 'var(--spacing-1)',
                    padding: 'var(--spacing-2)',
                    borderRadius: 'var(--radius-element)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background-surface)',
                  }}
                >
                  {enfants.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label={t('quest.minutesLabel')}
                type="number"
                value={String(consoMin)}
                onChange={e => setConsoMin(Number(e.target.value))}
              />
              <Button
                variant="outline"
                onClick={() => {
                  const err = consommer(consoEnfant, consoMin, membre.id);
                  toast.show(messageErreur(err, t, t('quest.consumed')));
                }}
              >
                {t('quest.consumeAction')}
              </Button>
            </div>
          </Card>
        </>
      ) : null}

      {onglet === 'foyer' ? (
        <Card>
          <CardHeader title={t('quest.foyerSettings')} />
          <div data-quest="stack">
            <p data-quest="supporting">
              {t('quest.codes', {
                enfant: foyer.codeEnfant,
                parent: foyer.codeCoparent,
              })}
            </p>
            <div data-quest="row">
              <QrCodeInvite
                code={foyer.codeEnfant}
                label={t('quest.qrChild')}
              />
              <QrCodeInvite
                code={foyer.codeCoparent}
                label={t('quest.qrCoparent')}
              />
            </div>
            <div data-quest="row">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void partagerInvitation(foyer.codeEnfant).then(r => {
                    toast.show(
                      r === 'shared'
                        ? t('quest.shareDone')
                        : r === 'copied'
                          ? t('quest.shareCopied')
                          : t('quest.shareFailed')
                    );
                  })
                }
              >
                {t('quest.shareInvite')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const next = !soundOn;
                  setSonActive(next);
                  setSoundOn(next);
                  toast.show(next ? t('quest.soundOn') : t('quest.soundOff'));
                }}
              >
                {t('quest.soundToggle')}
              </Button>
            </div>
            {foyer.codeLecture ? (
              <p data-quest="supporting">
                {t('quest.lectureCode')} : {foyer.codeLecture}
              </p>
            ) : null}
            {!lectureSeule ? (
              <>
                <TextField
                  label={t('quest.foyerName')}
                  value={nomFoyer}
                  onChange={e => setNomFoyer(e.target.value)}
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <TextField
                    label={t('quest.pointsTaux')}
                    type="number"
                    value={pts}
                    onChange={e => setPts(e.target.value)}
                  />
                  <TextField
                    label={t('quest.minutesTaux')}
                    type="number"
                    value={mins}
                    onChange={e => setMins(e.target.value)}
                  />
                  <TextField
                    label={t('quest.plafondLabel')}
                    type="number"
                    value={plafond}
                    onChange={e => setPlafond(e.target.value)}
                  />
                </div>
                <p data-quest="supporting">{t('quest.plafondHint')}</p>
                <Button
                  onClick={() => {
                    const err = majFoyer({
                      nom: nomFoyer,
                      pointsTaux: Number(pts),
                      minutesTaux: Number(mins),
                      plafondMinutesJour: Number(plafond) || null,
                    });
                    toast.show(messageErreur(err, t, t('quest.foyerSaved')));
                  }}
                >
                  {t('quest.saveFoyer')}
                </Button>
                <div data-quest="row">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const err = regenererCode('enfant');
                      toast.show(messageErreur(err, t, t('quest.codeRegen')));
                    }}
                  >
                    {t('quest.regenChildCode')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const err = regenererCode('coparent');
                      toast.show(messageErreur(err, t, t('quest.codeRegen')));
                    }}
                  >
                    {t('quest.regenParentCode')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const err = regenererCode('lecture');
                      toast.show(messageErreur(err, t, t('quest.codeRegen')));
                    }}
                  >
                    {t('quest.regenLectureCode')}
                  </Button>
                </div>
                {enfants.map(e => (
                  <div key={e.id} data-quest="stack">
                    <p data-quest="label">
                      <AvatarInitiales membre={e} size={22} /> {e.displayName}
                    </p>
                    <div data-quest="row">
                      {AVATAR_EMOJIS.map(em => (
                        <Button
                          key={em}
                          size="sm"
                          variant={e.avatarEmoji === em ? 'primary' : 'outline'}
                          onClick={() => {
                            const err = majAvatar(e.id, { avatarEmoji: em });
                            if (!err) trackQuest('avatar');
                          }}
                        >
                          {em}
                        </Button>
                      ))}
                    </div>
                    <div data-quest="row">
                      {AVATAR_COLORS.map(c => (
                        <Button
                          key={c}
                          size="sm"
                          variant="outline"
                          onClick={() => majAvatar(e.id, { avatarColor: c })}
                          style={{ background: c, minWidth: 28 }}
                          aria-label={t('quest.avatarColor')}
                        >
                          {' '}
                        </Button>
                      ))}
                    </div>
                    <TextField
                      label={t('quest.pinLabel')}
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinDraft[e.id] ?? ''}
                      onChange={ev =>
                        setPinDraft(prev => ({
                          ...prev,
                          [e.id]: ev.target.value
                            .replace(/\D/g, '')
                            .slice(0, 4),
                        }))
                      }
                    />
                    <div data-quest="row">
                      <Button
                        size="sm"
                        onClick={() =>
                          void definirPin(e.id, pinDraft[e.id] ?? '').then(
                            err =>
                              toast.show(
                                messageErreur(err, t, t('quest.pinSet'))
                              )
                          )
                        }
                      >
                        {t('quest.pinSetAction')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void definirPin(e.id, null).then(err =>
                            toast.show(
                              messageErreur(err, t, t('quest.pinClear'))
                            )
                          )
                        }
                      >
                        {t('quest.pinClearAction')}
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            ) : null}
            {!lectureSeule && coParents.length > 0 ? (
              <div data-quest="stack">
                <p data-quest="label">{t('quest.transferTitle')}</p>
                <p data-quest="supporting">{t('quest.transferHint')}</p>
                <div data-quest="row">
                  {coParents.map(p => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const err = transfererOwner(p.id);
                        if (err) {
                          toast.show(
                            messageErreur(err, t, t('quest.transferDone'))
                          );
                          return;
                        }
                        if (p.authUserId && syncDisponible()) {
                          void transfererPropriete(foyer.id, p.authUserId).then(
                            syncErr => {
                              if (syncErr) {
                                toast.show(
                                  messageErreur(
                                    syncErr,
                                    t,
                                    t('quest.syncFailed')
                                  )
                                );
                              }
                            }
                          );
                        }
                        trackQuest('transferer_owner');
                        toast.show(t('quest.transferDone'));
                      }}
                    >
                      {p.displayName}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            {!lectureSeule ? (
              <>
                <TextField
                  label={t('quest.addChild')}
                  value={nouvelEnfant}
                  onChange={e => setNouvelEnfant(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const err = ajouterMembre('enfant', nouvelEnfant);
                    if (!err) setNouvelEnfant('');
                    toast.show(messageErreur(err, t, t('quest.childAdded')));
                  }}
                >
                  {t('quest.addChildAction')}
                </Button>
              </>
            ) : null}
            <ul data-quest="list">
              {[...parents, ...enfants].map(m => (
                <li
                  key={m.id}
                  data-quest="row"
                  style={{ justifyContent: 'space-between' }}
                >
                  <span>
                    {m.displayName} ({m.role})
                  </span>
                  {m.id !== membre.id ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const err = retirerMembre(m.id);
                        toast.show(
                          messageErreur(err, t, t('quest.memberRemoved'))
                        );
                      }}
                    >
                      {t('quest.deactivate')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      {onglet === 'actes' && !lectureSeule ? (
        <Card>
          <CardHeader title={t('quest.actsAdmin')} />
          <ul data-quest="list" style={{ marginBottom: 'var(--spacing-3)' }}>
            {actes.map(a => (
              <li
                key={a.id}
                data-quest="row"
                style={{ justifyContent: 'space-between' }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <ActeIcon name={a.icone} />
                  {a.titre} {a.actif ? '' : `(${t('quest.inactive')})`}
                  {a.streak ? (
                    <>
                      {' '}
                      <StreakBadge jours={0} requis={a.streak.joursRequis} />
                    </>
                  ) : null}
                </span>
                <div data-quest="row">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => chargerActe(a)}
                  >
                    {t('quest.editAct')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const err = setActeActif(a.id, !a.actif);
                      toast.show(messageErreur(err, t, t('quest.actUpdated')));
                    }}
                  >
                    {a.actif ? t('quest.deactivate') : t('quest.activate')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div
            data-quest="stack"
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 'var(--spacing-3)',
            }}
          >
            <p data-quest="label">
              {editId ? t('quest.editAct') : t('quest.newAct')}
            </p>
            <TextField
              label={t('quest.actTitle')}
              value={brouillon.titre}
              onChange={e =>
                setBrouillon(b => ({ ...b, titre: e.target.value }))
              }
            />
            <TextField
              label={t('quest.actDesc')}
              value={brouillon.description}
              onChange={e =>
                setBrouillon(b => ({ ...b, description: e.target.value }))
              }
            />
            <label data-quest="label">
              {t('quest.actScope')}
              <select
                value={brouillon.portee}
                onChange={e =>
                  setBrouillon(b => ({
                    ...b,
                    portee: e.target.value as Acte['portee'],
                  }))
                }
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 'var(--spacing-1)',
                  padding: 'var(--spacing-2)',
                  borderRadius: 'var(--radius-element)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background-surface)',
                }}
              >
                <option value="perso">{t('quest.scopePerso')}</option>
                <option value="collectif">{t('quest.scopeCollectif')}</option>
              </select>
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-2)',
              }}
            >
              <TextField
                label={t('quest.actPoints')}
                type="number"
                value={String(brouillon.points)}
                onChange={e =>
                  setBrouillon(b => ({
                    ...b,
                    points: Number(e.target.value) || 0,
                  }))
                }
              />
              <TextField
                label={t('quest.actMinutes')}
                type="number"
                value={String(brouillon.minutesDirectes)}
                onChange={e =>
                  setBrouillon(b => ({
                    ...b,
                    minutesDirectes: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <StreakFields
              streak={brouillon.streak}
              onChange={streak => setBrouillon(b => ({ ...b, streak }))}
            />
            <div data-quest="row">
              <Button
                onClick={() => {
                  const err = upsertActe(editId, brouillon);
                  if (!err) {
                    setBrouillon(BROUILLON_VIDE);
                    setEditId(null);
                  }
                  toast.show(
                    messageErreur(
                      err,
                      t,
                      editId ? t('quest.actUpdated') : t('quest.actCreated')
                    )
                  );
                }}
              >
                {editId ? t('quest.saveFoyer') : t('quest.createAct')}
              </Button>
              {editId ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditId(null);
                    setBrouillon(BROUILLON_VIDE);
                  }}
                >
                  {t('quest.switch')}
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
