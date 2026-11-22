import { useState } from 'react';
import { KeyRound, Shield, UserRound } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import {
  lireCodeInviteUrl,
  marquerPorteChoisie,
  porteChoisie,
} from './deep-link.ts';
import { messageErreur } from './errors.ts';
import { rejoindreParCode, syncDisponible } from './sync.ts';
import { useQuest } from './store.ts';

function etatInitialPorte(): {
  etape: 'porte' | 'roles';
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
  const foyer = useQuest(s => s.foyer);
  const choisirRole = useQuest(s => s.choisirRole);
  const deverrouillerParCode = useQuest(s => s.deverrouillerParCode);
  const appliquerFoyerDistant = useQuest(s => s.appliquerFoyerDistant);
  const creerEnfantApresCode = useQuest(s => s.creerEnfantApresCode);
  const parents = foyer.membres.filter(m => m.role === 'parent' && m.actif);
  const initial = etatInitialPorte();
  const [etape, setEtape] = useState<'porte' | 'roles'>(initial.etape);
  const [code, setCode] = useState(initial.code);
  const [porte, setPorte] = useState<'fermee' | 'enfant' | 'coparent'>(
    'fermee'
  );
  const [nouveauPrenom, setNouveauPrenom] = useState('');

  const enfants = foyer.membres.filter(m => m.role === 'enfant' && m.actif);

  const creerFoyer = () => {
    marquerPorteChoisie();
    setEtape('roles');
  };

  const rejoindre = () => {
    marquerPorteChoisie();
    setEtape('roles');
    setPorte('fermee');
  };

  const ouvrirCode = async () => {
    const local = deverrouillerParCode(code);
    if (local) {
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
                    onClick={() =>
                      choisirRole({
                        role: 'enfant',
                        membreId: m.id,
                        codeInvite: code.trim().toUpperCase(),
                      })
                    }
                  >
                    <UserRound aria-hidden className="size-4" />
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
                    choisirRole({
                      role: 'enfant',
                      membreId: result,
                      codeInvite: code.trim().toUpperCase(),
                    });
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
            <div>
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
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
