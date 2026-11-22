import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock,
  KeyRound,
  Shield,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { REPO_URL } from '../../app/links.ts';
import { lireStreak, minutesPourActe, soldeMinutes } from './economy.ts';
import { messageErreur } from './errors.ts';
import {
  pousserFoyer,
  rejoindreParCode,
  syncDisponible,
  tirerFoyer,
} from './sync.ts';
import { useQuest, type ActeBrouillon } from './store.ts';
import type { Acte, Membre, StatutDeclaration } from './types.ts';

export function HomeScreen() {
  const { t } = useI18n();
  const load = useQuest(s => s.load);
  const ready = useQuest(s => s.ready);
  const session = useQuest(s => s.session);

  useEffect(() => {
    load();
  }, [load]);

  if (!ready) {
    return <p className="text-sm opacity-70">{t('quest.loading')}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p
        className="text-base leading-relaxed"
        style={{ color: 'var(--dwc-text-soft)' }}
      >
        {t('app.tagline')}
      </p>

      {!session ? <RoleGate /> : null}
      {session?.role === 'enfant' ? <ChildView /> : null}
      {session?.role === 'parent' ? <ParentView /> : null}

      <AppFooter repoUrl={REPO_URL} issues />
    </div>
  );
}

function RoleGate() {
  const { t } = useI18n();
  const toast = useToast();
  const foyer = useQuest(s => s.foyer);
  const choisirRole = useQuest(s => s.choisirRole);
  const deverrouillerParCode = useQuest(s => s.deverrouillerParCode);
  const appliquerFoyerDistant = useQuest(s => s.appliquerFoyerDistant);
  const parents = foyer.membres.filter(m => m.role === 'parent' && m.actif);
  const [code, setCode] = useState('');
  const [porte, setPorte] = useState<'fermee' | 'enfant' | 'coparent'>(
    'fermee'
  );

  const enfants = foyer.membres.filter(m => m.role === 'enfant' && m.actif);

  const ouvrirCode = async () => {
    const local = deverrouillerParCode(code);
    if (local) {
      setPorte(local.role === 'coparent' ? 'coparent' : 'enfant');
      return;
    }
    if (syncDisponible()) {
      const distant = await rejoindreParCode(code);
      if (typeof distant === 'string') {
        toast.show(messageErreur(distant, t('quest.codeInvalid')));
        return;
      }
      appliquerFoyerDistant(distant);
      const role = deverrouillerParCode(code);
      setPorte(role?.role === 'coparent' ? 'coparent' : 'enfant');
      return;
    }
    toast.show(messageErreur('code-invalide', t('quest.codeInvalid')));
  };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader title={t('quest.whoTitle')} subtitle={t('quest.whoHint')} />
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-2 text-sm font-medium">{t('quest.parents')}</p>
            <div className="flex flex-wrap gap-2">
              {parents.map(m => (
                <Button
                  key={m.id}
                  variant="outline"
                  onClick={() =>
                    choisirRole({ role: 'parent', membreId: m.id })
                  }
                >
                  <Shield aria-hidden className="size-4" />
                  {m.displayName}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="m-0 text-sm font-medium">{t('quest.codeTitle')}</p>
            <TextField
              label={t('quest.codeLabel')}
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="BONUS"
            />
            <Button onClick={() => void ouvrirCode()}>
              <KeyRound aria-hidden className="size-4" />
              {t('quest.codeUnlock')}
            </Button>
          </div>

          {porte === 'enfant' ? (
            <div>
              <p className="mb-2 text-sm font-medium">{t('quest.enfants')}</p>
              <div className="flex flex-wrap gap-2">
                {enfants.map(m => (
                  <Button
                    key={m.id}
                    onClick={() =>
                      choisirRole({ role: 'enfant', membreId: m.id })
                    }
                  >
                    <UserRound aria-hidden className="size-4" />
                    {m.displayName}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {porte === 'coparent' ? (
            <div>
              <p className="mb-2 text-sm font-medium">{t('quest.parents')}</p>
              <div className="flex flex-wrap gap-2">
                {parents.map(m => (
                  <Button
                    key={m.id}
                    onClick={() =>
                      choisirRole({ role: 'parent', membreId: m.id })
                    }
                  >
                    <Shield aria-hidden className="size-4" />
                    {m.displayName}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function SessionBar({ membre }: { membre: Membre }) {
  const { t } = useI18n();
  const quitterSession = useQuest(s => s.quitterSession);
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="m-0 text-sm font-medium">
        {t('quest.hello', { name: membre.displayName })}
      </p>
      <Button variant="ghost" size="sm" onClick={quitterSession}>
        {t('quest.switch')}
      </Button>
    </div>
  );
}

function StreakBadge({ jours, requis }: { jours: number; requis: number }) {
  const { t } = useI18n();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        background: 'var(--dwc-primary-soft, var(--dwc-surface-2))',
        color: 'var(--dwc-primary)',
      }}
    >
      <Star aria-hidden className="size-3" />
      {t('quest.streakProgress', { jours, requis })}
    </span>
  );
}

function ChildView() {
  const { t } = useI18n();
  const toast = useToast();
  const foyer = useQuest(s => s.foyer);
  const session = useQuest(s => s.session)!;
  const declarer = useQuest(s => s.declarer);
  const membre = foyer.membres.find(m => m.id === session.membreId)!;
  const solde = soldeMinutes(foyer, membre.id);
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

  const onDeclare = (acte: Acte) => {
    const parts =
      acte.portee === 'collectif'
        ? (collectifPour[acte.id] ?? [membre.id])
        : [membre.id];
    const err = declarer(acte.id, parts);
    toast.show(messageErreur(err, t('quest.declared')));
  };

  return (
    <div className="flex flex-col gap-4">
      <SessionBar membre={membre} />

      <Card>
        <CardHeader title={t('quest.balance')} />
        <p className="m-0 flex items-baseline gap-2 text-3xl font-semibold">
          <Sparkles aria-hidden className="size-6" />
          {t('quest.minutes', { count: solde })}
        </p>
      </Card>

      <Card>
        <CardHeader title={t('quest.catalogue')} />
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {actes.map(acte => {
            const reward = minutesPourActe(
              acte,
              foyer.pointsTaux,
              foyer.minutesTaux
            );
            const streak = lireStreak(foyer, membre.id, acte.id);
            const selected = collectifPour[acte.id] ?? [membre.id];
            return (
              <li
                key={acte.id}
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--dwc-border)' }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <p className="m-0 font-medium">{acte.titre}</p>
                    <p
                      className="m-0 text-sm"
                      style={{ color: 'var(--dwc-text-soft)' }}
                    >
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
                  <div className="mt-2 flex flex-wrap gap-2">
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
                              const next = on
                                ? cur.filter(id => id !== e.id)
                                : [...cur, e.id];
                              return {
                                ...prev,
                                [acte.id]: next.length > 0 ? next : [membre.id],
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
        <div className="mb-3 flex flex-wrap gap-2">
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
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {historiques.slice(0, 20).map(d => {
              const acte = foyer.actes.find(a => a.id === d.acteId);
              return (
                <li key={d.id} className="flex flex-col gap-0.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{acte?.titre ?? d.acteId}</span>
                    <span className="inline-flex items-center gap-1">
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
                    <span style={{ color: 'var(--dwc-text-soft)' }}>
                      {d.motifRefus}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ParentView() {
  const { t } = useI18n();
  const toast = useToast();
  const foyer = useQuest(s => s.foyer);
  const session = useQuest(s => s.session)!;
  const valider = useQuest(s => s.valider);
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
  const [brouillon, setBrouillon] = useState<ActeBrouillon>({
    titre: '',
    description: '',
    portee: 'perso',
    points: 10,
    minutesDirectes: 0,
    streak: null,
    actif: true,
  });

  const soldes = useMemo(
    () =>
      enfants.map(e => ({
        id: e.id,
        name: e.displayName,
        minutes: soldeMinutes(foyer, e.id),
      })),
    [enfants, foyer]
  );

  return (
    <div className="flex flex-col gap-4">
      <SessionBar membre={membre} />

      <Card>
        <CardHeader
          title={t('quest.parentBoard')}
          subtitle={t('quest.taux', {
            pts: foyer.pointsTaux,
            min: foyer.minutesTaux,
          })}
        />
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {soldes.map(s => (
            <li key={s.id} className="flex justify-between text-sm">
              <span>{s.name}</span>
              <strong>{t('quest.minutes', { count: s.minutes })}</strong>
            </li>
          ))}
        </ul>
        <p
          className="mb-0 mt-3 text-xs"
          style={{ color: 'var(--dwc-text-soft)' }}
        >
          {t('quest.codes', {
            enfant: foyer.codeEnfant,
            parent: foyer.codeCoparent,
          })}
        </p>
        {syncDisponible() ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void pousserFoyer(foyer).then(err =>
                  toast.show(messageErreur(err, t('quest.syncPushed')))
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
                    toast.show(messageErreur(res, t('quest.syncFailed')));
                    return;
                  }
                  appliquerFoyerDistant(res);
                  toast.show(t('quest.syncPulled'));
                })
              }
            >
              {t('quest.syncPull')}
            </Button>
          </div>
        ) : (
          <p
            className="mb-0 mt-2 text-xs"
            style={{ color: 'var(--dwc-text-soft)' }}
          >
            {t('quest.syncLocalOnly')}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader title={t('quest.inbox')} />
        {pending.length === 0 ? (
          <EmptyState title={t('quest.inboxEmpty')} />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {pending.map(d => {
              const acte = foyer.actes.find(a => a.id === d.acteId);
              const qui = d.participants
                .map(id => foyer.membres.find(m => m.id === id)?.displayName)
                .filter(Boolean)
                .join(', ');
              return (
                <li
                  key={d.id}
                  className="rounded-lg border p-3"
                  style={{ borderColor: 'var(--dwc-border)' }}
                >
                  <p className="m-0 font-medium">{acte?.titre}</p>
                  <p
                    className="m-0 mb-2 text-sm"
                    style={{ color: 'var(--dwc-text-soft)' }}
                  >
                    {qui}
                  </p>
                  <TextField
                    label={t('quest.refuseReason')}
                    value={motif[d.id] ?? ''}
                    onChange={e =>
                      setMotif(prev => ({ ...prev, [d.id]: e.target.value }))
                    }
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const err = valider(d.id, membre.id);
                        toast.show(messageErreur(err, t('quest.validated')));
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
                        toast.show(messageErreur(err, t('quest.refused')));
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

      <Card>
        <CardHeader title={t('quest.manualCredit')} />
        <div className="flex flex-col gap-2">
          <label className="text-sm">
            {t('quest.acte')}
            <select
              className="mt-1 w-full rounded-md border px-2 py-2"
              style={{ borderColor: 'var(--dwc-border)' }}
              value={creditActe}
              onChange={e => setCreditActe(e.target.value)}
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
          <label className="text-sm">
            {t('quest.enfant')}
            <select
              className="mt-1 w-full rounded-md border px-2 py-2"
              style={{ borderColor: 'var(--dwc-border)' }}
              value={creditEnfant}
              onChange={e => setCreditEnfant(e.target.value)}
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
              const err = creditManuel(creditActe, [creditEnfant], membre.id);
              toast.show(messageErreur(err, t('quest.credited')));
            }}
          >
            {t('quest.credit')}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('quest.consume')} />
        <div className="flex flex-col gap-2">
          <label className="text-sm">
            {t('quest.enfant')}
            <select
              className="mt-1 w-full rounded-md border px-2 py-2"
              style={{ borderColor: 'var(--dwc-border)' }}
              value={consoEnfant}
              onChange={e => setConsoEnfant(e.target.value)}
            >
              {enfants.map(e => (
                <option key={e.id} value={e.id}>
                  {e.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {t('quest.minutesLabel')}
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-md border px-2 py-2"
              style={{ borderColor: 'var(--dwc-border)' }}
              value={consoMin}
              onChange={e => setConsoMin(Number(e.target.value))}
            />
          </label>
          <Button
            variant="outline"
            onClick={() => {
              const err = consommer(consoEnfant, consoMin, membre.id);
              toast.show(messageErreur(err, t('quest.consumed')));
            }}
          >
            {t('quest.consumeAction')}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('quest.foyerSettings')} />
        <div className="flex flex-col gap-2">
          <TextField
            label={t('quest.foyerName')}
            value={nomFoyer}
            onChange={e => setNomFoyer(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
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
          </div>
          <Button
            onClick={() => {
              const err = majFoyer({
                nom: nomFoyer,
                pointsTaux: Number(pts),
                minutesTaux: Number(mins),
              });
              toast.show(messageErreur(err, t('quest.foyerSaved')));
            }}
          >
            {t('quest.saveFoyer')}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const err = regenererCode('enfant');
                toast.show(messageErreur(err, t('quest.codeRegen')));
              }}
            >
              {t('quest.regenChildCode')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const err = regenererCode('coparent');
                toast.show(messageErreur(err, t('quest.codeRegen')));
              }}
            >
              {t('quest.regenParentCode')}
            </Button>
          </div>
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
              toast.show(messageErreur(err, t('quest.childAdded')));
            }}
          >
            {t('quest.addChildAction')}
          </Button>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {[...parents, ...enfants].map(m => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2"
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
                      toast.show(messageErreur(err, t('quest.memberRemoved')));
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

      <Card>
        <CardHeader title={t('quest.actsAdmin')} />
        <ul className="m-0 mb-3 flex list-none flex-col gap-2 p-0">
          {actes.map(a => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>
                {a.titre} {a.actif ? '' : `(${t('quest.inactive')})`}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const err = setActeActif(a.id, !a.actif);
                  toast.show(messageErreur(err, t('quest.actUpdated')));
                }}
              >
                {a.actif ? t('quest.deactivate') : t('quest.activate')}
              </Button>
            </li>
          ))}
        </ul>
        <div
          className="flex flex-col gap-2 border-t pt-3"
          style={{ borderColor: 'var(--dwc-border)' }}
        >
          <p className="m-0 text-sm font-medium">{t('quest.newAct')}</p>
          <TextField
            label={t('quest.actTitle')}
            value={brouillon.titre}
            onChange={e => setBrouillon(b => ({ ...b, titre: e.target.value }))}
          />
          <TextField
            label={t('quest.actDesc')}
            value={brouillon.description}
            onChange={e =>
              setBrouillon(b => ({ ...b, description: e.target.value }))
            }
          />
          <label className="text-sm">
            {t('quest.actScope')}
            <select
              className="mt-1 w-full rounded-md border px-2 py-2"
              style={{ borderColor: 'var(--dwc-border)' }}
              value={brouillon.portee}
              onChange={e =>
                setBrouillon(b => ({
                  ...b,
                  portee: e.target.value as Acte['portee'],
                }))
              }
            >
              <option value="perso">{t('quest.scopePerso')}</option>
              <option value="collectif">{t('quest.scopeCollectif')}</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
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
          <Button
            onClick={() => {
              const err = upsertActe(null, brouillon);
              if (!err) {
                setBrouillon({
                  titre: '',
                  description: '',
                  portee: 'perso',
                  points: 10,
                  minutesDirectes: 0,
                  streak: null,
                  actif: true,
                });
              }
              toast.show(messageErreur(err, t('quest.actCreated')));
            }}
          >
            {t('quest.createAct')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
