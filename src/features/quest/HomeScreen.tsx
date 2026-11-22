import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Shield, Sparkles, UserRound, X } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { REPO_URL } from '../../app/links.ts';
import { lireStreak, minutesPourActe, soldeMinutes } from './economy.ts';
import { messageErreur } from './errors.ts';
import { useQuest } from './store.ts';
import type { Acte, Membre } from './types.ts';

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

      <AppFooter repoUrl={REPO_URL} />
    </div>
  );
}

function RoleGate() {
  const { t } = useI18n();
  const foyer = useQuest(s => s.foyer);
  const choisirRole = useQuest(s => s.choisirRole);
  const parents = foyer.membres.filter(m => m.role === 'parent' && m.actif);
  const enfants = foyer.membres.filter(m => m.role === 'enfant' && m.actif);

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
          <p className="m-0 text-xs" style={{ color: 'var(--dwc-text-soft)' }}>
            {t('quest.mvpLocal', { code: foyer.codeEnfant })}
          </p>
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

  const historiques = foyer.declarations.filter(
    d => d.declarePar === membre.id || d.participants.includes(membre.id)
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
                  <div>
                    <p className="m-0 font-medium">{acte.titre}</p>
                    <p
                      className="m-0 text-sm"
                      style={{ color: 'var(--dwc-text-soft)' }}
                    >
                      {acte.description} ·{' '}
                      {t('quest.reward', { min: reward.minutes })}
                      {acte.streak
                        ? ` · ${t('quest.streakProgress', {
                            jours: streak.jours,
                            requis: acte.streak.joursRequis,
                          })}`
                        : ''}
                    </p>
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
        {historiques.length === 0 ? (
          <EmptyState title={t('quest.historyEmpty')} />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {historiques.slice(0, 12).map(d => {
              const acte = foyer.actes.find(a => a.id === d.acteId);
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>{acte?.titre ?? d.acteId}</span>
                  <span className="inline-flex items-center gap-1">
                    {d.statut === 'en_attente' ? (
                      <Clock className="size-3.5" />
                    ) : null}
                    {d.statut === 'validee' ? (
                      <Check className="size-3.5" />
                    ) : null}
                    {d.statut === 'refusee' ? <X className="size-3.5" /> : null}
                    {t(`quest.status.${d.statut}`)}
                  </span>
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
  const membre = foyer.membres.find(m => m.id === session.membreId)!;
  const enfants = foyer.membres.filter(m => m.role === 'enfant' && m.actif);
  const pending = foyer.declarations.filter(d => d.statut === 'en_attente');
  const actes = foyer.actes
    .filter(a => a.actif)
    .sort((a, b) => a.ordre - b.ordre);
  const [creditActe, setCreditActe] = useState(actes[0]?.id ?? '');
  const [creditEnfant, setCreditEnfant] = useState(enfants[0]?.id ?? '');
  const [consoEnfant, setConsoEnfant] = useState(enfants[0]?.id ?? '');
  const [consoMin, setConsoMin] = useState(10);

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
                  <div className="flex flex-wrap gap-2">
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
                        const err = refuser(d.id, membre.id);
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
              {actes.map(a => (
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
    </div>
  );
}
