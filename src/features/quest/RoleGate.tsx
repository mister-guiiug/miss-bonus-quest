import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Shield, UserRound } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useAuthContext } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { useI18n } from '../../i18n/index.ts';
import { AvatarInitiales } from './AvatarInitiales.tsx';
import {
  lireCodeInviteUrl,
  marquerPorteChoisie,
  porteChoisie,
} from './deep-link.ts';
import { messageErreur } from './errors.ts';
import { rejoindreCoparent, rejoindreParCode, syncDisponible } from './sync.ts';
import { useQuest } from './store.ts';

function etatInitialPorte(): {
  etape: 'porte' | 'creer' | 'roles';
  code: string;
} {
  const fromUrl = lireCodeInviteUrl();
  if (fromUrl) {
    marquerPorteChoisie();
    return { etape: 'roles', code: fromUrl };
  }
  if (porteChoisie()) return { etape: 'roles', code: '' };
  return { etape: 'porte', code: '' };
}

export function RoleGate() {
  const { t } = useI18n();
  const toast = useToast();
  const { signedIn } = useAuthContext();
  const foyer = useQuest(s => s.foyer);
  const choisirRole = useQuest(s => s.choisirRole);
  const deverrouillerParCode = useQuest(s => s.deverrouillerParCode);
  const appliquerFoyerDistant = useQuest(s => s.appliquerFoyerDistant);
  const creerEnfantApresCode = useQuest(s => s.creerEnfantApresCode);
  const creerFoyerPersonnalise = useQuest(s => s.creerFoyerPersonnalise);
  const verifierPin = useQuest(s => s.verifierPin);
  const parents = foyer.membres.filter(m => m.role === 'parent' && m.actif);
  const initial = etatInitialPorte();
  const [etape, setEtape] = useState<'porte' | 'creer' | 'roles'>(
    initial.etape
  );
  const [code, setCode] = useState(initial.code);
  const [porte, setPorte] = useState<
    'fermee' | 'enfant' | 'coparent' | 'lecture'
  >('fermee');
  const [nouveauPrenom, setNouveauPrenom] = useState('');
  const [nomFoyer, setNomFoyer] = useState('Notre foyer');
  const [parentNom, setParentNom] = useState('Parent');
  const [enfantsNoms, setEnfantsNoms] = useState('Léa, Tom');
  const [pinPrompt, setPinPrompt] = useState<{
    membreId: string;
    name: string;
  } | null>(null);
  const [pinSaisi, setPinSaisi] = useState('');

  const enfants = foyer.membres.filter(m => m.role === 'enfant' && m.actif);

  const creerFoyer = () => {
    setEtape('creer');
  };

  const validerCreation = () => {
    const kids = enfantsNoms
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(Boolean);
    const err = creerFoyerPersonnalise({
      nom: nomFoyer,
      parentNom,
      enfants: kids,
    });
    if (err) {
      toast.show(messageErreur(err, t, t('quest.codeInvalid')));
      return;
    }
    marquerPorteChoisie();
    setEtape('roles');
  };

  const rejoindre = () => {
    marquerPorteChoisie();
    setEtape('roles');
    setPorte('fermee');
  };

  const ouvrirEnfant = async (membreId: string, name: string) => {
    const m = foyer.membres.find(x => x.id === membreId);
    if (m?.pinHash) {
      setPinPrompt({ membreId, name });
      setPinSaisi('');
      return;
    }
    choisirRole({
      role: 'enfant',
      membreId,
      codeInvite: code.trim().toUpperCase() || undefined,
    });
  };

  const confirmerPin = async () => {
    if (!pinPrompt) return;
    const ok = await verifierPin(pinPrompt.membreId, pinSaisi);
    if (!ok) {
      toast.show(t('quest.pinWrong'));
      return;
    }
    choisirRole({
      role: 'enfant',
      membreId: pinPrompt.membreId,
      codeInvite: code.trim().toUpperCase() || undefined,
    });
    setPinPrompt(null);
  };

  const ouvrirCode = async () => {
    const local = deverrouillerParCode(code);
    if (local) {
      if (local.role === 'lecture') {
        const parent = parents[0];
        if (parent) {
          choisirRole({
            role: 'parent',
            membreId: parent.id,
            codeInvite: code.trim().toUpperCase(),
            lectureSeule: true,
          });
        }
        return;
      }
      setPorte(local.role === 'coparent' ? 'coparent' : 'enfant');
      return;
    }
    if (syncDisponible()) {
      const distant = await rejoindreParCode(code);
      if (typeof distant === 'string') {
        toast.show(messageErreur(distant, t, t('quest.codeInvalid')));
        return;
      }
      appliquerFoyerDistant(distant, { force: true });
      const role = deverrouillerParCode(code);
      if (role?.role === 'lecture') {
        const parent = useQuest
          .getState()
          .foyer.membres.find(m => m.role === 'parent' && m.actif);
        if (parent) {
          choisirRole({
            role: 'parent',
            membreId: parent.id,
            codeInvite: code.trim().toUpperCase(),
            lectureSeule: true,
          });
        }
        return;
      }
      setPorte(role?.role === 'coparent' ? 'coparent' : 'enfant');
      return;
    }
    toast.show(messageErreur('code-invalide', t, t('quest.codeInvalid')));
  };

  if (etape === 'porte') {
    return (
      <div data-quest="stack">
        <Card>
          <CardHeader
            title={t('quest.onboardTitle')}
            subtitle={t('quest.onboardHint')}
          />
          <div data-quest="stack">
            <Button onClick={creerFoyer}>{t('quest.onboardCreate')}</Button>
            <Button variant="outline" onClick={rejoindre}>
              {t('quest.onboardJoin')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (etape === 'creer') {
    return (
      <div data-quest="stack">
        <Card>
          <CardHeader
            title={t('quest.createFoyerTitle')}
            subtitle={t('quest.createFoyerHint')}
          />
          <div data-quest="stack">
            <TextField
              label={t('quest.foyerName')}
              value={nomFoyer}
              onChange={e => setNomFoyer(e.target.value)}
            />
            <TextField
              label={t('quest.parentName')}
              value={parentNom}
              onChange={e => setParentNom(e.target.value)}
            />
            <TextField
              label={t('quest.childrenNames')}
              value={enfantsNoms}
              onChange={e => setEnfantsNoms(e.target.value)}
              placeholder="Léa, Tom"
            />
            <Button onClick={validerCreation}>
              {t('quest.createFoyerAction')}
            </Button>
            <Button variant="ghost" onClick={() => setEtape('porte')}>
              {t('quest.switch')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (pinPrompt) {
    return (
      <div data-quest="stack">
        <Card>
          <CardHeader
            title={t('quest.pinTitle', { name: pinPrompt.name })}
            subtitle={t('quest.pinHint')}
          />
          <TextField
            label={t('quest.pinLabel')}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinSaisi}
            onChange={e =>
              setPinSaisi(e.target.value.replace(/\D/g, '').slice(0, 4))
            }
          />
          <div data-quest="row">
            <Button onClick={() => void confirmerPin()}>
              {t('quest.pinUnlock')}
            </Button>
            <Button variant="ghost" onClick={() => setPinPrompt(null)}>
              {t('quest.switch')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div data-quest="stack">
      <Card>
        <CardHeader title={t('quest.whoTitle')} subtitle={t('quest.whoHint')} />
        <div data-quest="stack">
          <div>
            <p data-quest="label">{t('quest.parents')}</p>
            <div data-quest="row">
              {parents.map(m => (
                <Button
                  key={m.id}
                  variant="outline"
                  onClick={() =>
                    choisirRole({
                      role: 'parent',
                      membreId: m.id,
                    })
                  }
                >
                  <Shield aria-hidden className="size-4" />
                  <AvatarInitiales membre={m} size={20} />
                  {m.displayName}
                </Button>
              ))}
            </div>
          </div>

          <div data-quest="stack">
            <p data-quest="label">{t('quest.codeTitle')}</p>
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
            <div data-quest="stack">
              <p data-quest="label">{t('quest.enfants')}</p>
              <div data-quest="row">
                {enfants.map(m => (
                  <Button
                    key={m.id}
                    onClick={() => void ouvrirEnfant(m.id, m.displayName)}
                  >
                    <UserRound aria-hidden className="size-4" />
                    <AvatarInitiales membre={m} size={20} />
                    {m.displayName}
                  </Button>
                ))}
              </div>
              <div data-quest="auth-callout">
                <p data-quest="label">{t('quest.createChildTitle')}</p>
                <p data-quest="supporting">{t('quest.createChildHint')}</p>
                <TextField
                  label={t('quest.addChild')}
                  value={nouveauPrenom}
                  onChange={e => setNouveauPrenom(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const result = creerEnfantApresCode(nouveauPrenom);
                    if (result === 'nom-requis') {
                      toast.show(
                        messageErreur(result, t, t('quest.codeInvalid'))
                      );
                      return;
                    }
                    void ouvrirEnfant(result, nouveauPrenom);
                    setNouveauPrenom('');
                    toast.show(t('quest.childAdded'));
                  }}
                >
                  {t('quest.createChildAction')}
                </Button>
              </div>
            </div>
          ) : null}

          {porte === 'coparent' ? (
            <div data-quest="stack">
              <p data-quest="label">{t('quest.parents')}</p>
              <div data-quest="row">
                {parents.map(m => (
                  <Button
                    key={m.id}
                    onClick={() =>
                      choisirRole({
                        role: 'parent',
                        membreId: m.id,
                        codeInvite: code.trim().toUpperCase(),
                      })
                    }
                  >
                    <Shield aria-hidden className="size-4" />
                    {m.displayName}
                  </Button>
                ))}
              </div>
              {syncDisponible() && !signedIn ? (
                <div data-quest="auth-callout">
                  <p data-quest="label">{t('quest.coparentAuthTitle')}</p>
                  <p data-quest="supporting">{t('quest.coparentAuthBody')}</p>
                  <Link to="/compte">
                    <Button size="sm" variant="outline">
                      {t('quest.authCalloutCta')}
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => {
                      void rejoindreCoparent(code).then(res => {
                        if (typeof res === 'string') {
                          toast.show(
                            messageErreur(res, t, t('quest.codeInvalid'))
                          );
                          return;
                        }
                        appliquerFoyerDistant(res, { force: true });
                        toast.show(t('quest.coparentJoined'));
                      });
                    }}
                  >
                    {t('quest.coparentJoinNow')}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
