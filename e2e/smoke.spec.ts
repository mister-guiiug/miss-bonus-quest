import { expect, test } from '@playwright/test';
import { deverrouillerEnfant, passerPorte } from './foyer.ts';

/**
 * Le SMOKE : ce qui doit marcher pour qu'une livraison ait un sens.
 *
 * Le tag `@critical` est celui que la CI de la famille exécute
 * (`playwright test --grep @critical`) : une spec sans lui n'est PAS jouée en
 * intégration continue, et le workflow rapporte « No tests found » sans
 * échouer. C'est une panne silencieuse que le parc a déjà connue.
 *
 * Ces tests passent sur un BUILD de production, service worker compris.
 *
 * MVP 2 : foyer local + porte enfant par code (BONUS), sync optionnelle.
 */
test.describe('@critical le cadre', () => {
  test("l'accueil s'ouvre et porte le nom de l'app", async ({ page }) => {
    await page.goto('/');
    // Le nom de l'app, pas celui de l'écran : c'est le seul `h1` que lit un
    // moteur. La porte créer/rejoindre précède « Qui joue ? » (ADR 0017).
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Miss Bonus Quest'
    );
    await expect(page.getByText('Ton foyer')).toBeVisible();
    await passerPorte(page);
    await expect(page.getByText('Qui joue ?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Parent' })).toBeVisible();
    await expect(page.getByLabel('Code foyer')).toBeVisible();
    // Léa n’apparaît qu’après le code d’invitation.
    await expect(page.getByRole('button', { name: 'Léa' })).toHaveCount(0);
  });

  test('déclarer, valider et voir le solde survivent au rechargement', async ({
    page,
  }) => {
    // Léa déclare « Ranger sa chambre », Parent valide → 12 min
    // (15 pts → 7 min + 5 min directes).
    await page.goto('/');
    await deverrouillerEnfant(page, { enfant: 'Léa' });
    await expect(page.getByText('Bonjour Léa')).toBeVisible();

    const acte = page
      .getByRole('listitem')
      .filter({ hasText: 'Ranger sa chambre' });
    await acte.getByRole('button', { name: 'J’ai fait' }).click();
    await expect(page.getByText('En attente').first()).toBeVisible();

    await page.getByRole('button', { name: 'Changer' }).click();
    await page.getByRole('button', { name: 'Parent' }).click();
    await expect(page.getByText('Bonjour Parent')).toBeVisible();

    const pending = page
      .getByRole('listitem')
      .filter({ hasText: 'Ranger sa chambre' });
    await pending.getByRole('button', { name: 'Valider' }).click();
    await expect(page.getByText('Rien en attente.')).toBeVisible();
    const soldeLea = page.getByRole('listitem').filter({ hasText: 'Léa' });
    await expect(soldeLea.getByText('12 min')).toBeVisible();

    // Sursis 8 s : Annuler restaure l’état d’avant la validation (ADR 0017).
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(soldeLea.getByText('0 min')).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Ranger sa chambre' })
    ).toBeVisible();
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Ranger sa chambre' })
      .getByRole('button', { name: 'Valider' })
      .click();
    await expect(soldeLea.getByText('12 min')).toBeVisible();

    // Session locale (sessionStorage) : le profil Parent reste après reload.
    await page.reload();
    await expect(page.getByText('Bonjour Parent')).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Léa' }).getByText('12 min')
    ).toBeVisible();
  });

  test('crédit manuel et consommation sans solde négatif', async ({ page }) => {
    await page.goto('/');
    await passerPorte(page);
    await page.getByRole('button', { name: 'Parent' }).click();
    await page.getByRole('button', { name: 'Actions' }).click();

    const soldeLea = page.getByRole('listitem').filter({ hasText: 'Léa' });

    await page.getByRole('button', { name: 'Créditer' }).click();
    // « Faire son lit » : 10 pts → 5 min (taux 10→5), pas de minutes directes.
    await expect(soldeLea.getByText('5 min')).toBeVisible();

    await page.getByLabel('Minutes', { exact: true }).fill('3');
    await page.getByRole('button', { name: 'Consommer' }).click();
    await expect(soldeLea.getByText('2 min')).toBeVisible();

    // Consommer plus que le solde : le magasin borne à zéro.
    await page.getByLabel('Minutes', { exact: true }).fill('99');
    await page.getByRole('button', { name: 'Consommer' }).click();
    await expect(soldeLea.getByText('0 min')).toBeVisible();
  });

  test('hors ligne, une déclaration n’est pas perdue au retour du réseau', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await expect(page.locator('[data-dwc="sync-status"]')).toHaveCount(0);

    await context.setOffline(true);

    await deverrouillerEnfant(page, { enfant: 'Léa' });
    const acte = page
      .getByRole('listitem')
      .filter({ hasText: 'Faire son lit' });
    await acte.getByRole('button', { name: 'J’ai fait' }).click();
    await expect(page.getByText('En attente').first()).toBeVisible();

    await expect(page.locator('[data-dwc="connection-banner"]')).toBeVisible({
      timeout: 10_000,
    });

    await context.setOffline(false);
    await page.reload();
    await expect(page.getByText('Bonjour Léa')).toBeVisible();
    await expect(page.getByText('Faire son lit').first()).toBeVisible();
    await expect(page.getByText('En attente').first()).toBeVisible();
  });

  test('le deep link ?code= saute la porte et préremplit', async ({ page }) => {
    await page.goto('/?code=bonus');
    await expect(page.getByText('Qui joue ?')).toBeVisible();
    await expect(page.getByLabel('Code foyer')).toHaveValue('BONUS');
    await expect(
      page.getByRole('button', { name: 'Créer mon foyer' })
    ).toHaveCount(0);
  });

  test('la navigation atteint les quatre destinations', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Réglages' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Réglages'
    );

    await page.getByRole('link', { name: 'Compte' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Compte');

    await page.getByRole('link', { name: 'À propos' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'À propos'
    );
  });

  test('sans backend, l’écran de compte le DIT au lieu de disparaître', async ({
    page,
  }) => {
    await page.goto('/compte');
    await expect(page.getByText('Mode local')).toBeVisible();

    await expect(page.getByTestId('zone-dangereuse')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Supprimer mon compte' })
    ).toHaveCount(0);
  });

  test('un lien profond rafraîchi sert l’app, pas la page d’erreur', async ({
    page,
  }) => {
    await page.goto('/reglages');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Réglages'
    );
  });

  test('un foyer exporté s’importe, remplace tout, et survit au rechargement', async ({
    page,
  }) => {
    await page.goto('/');
    await deverrouillerEnfant(page, { enfant: 'Léa' });
    const acte = page
      .getByRole('listitem')
      .filter({ hasText: 'Mettre la table' });
    await acte.getByRole('button', { name: 'J’ai fait' }).click();
    await expect(page.getByText('En attente').first()).toBeVisible();

    // Quitter la session : l’import remplace les ids membres, un profil
    // resté collé à l’ancien id casserait l’écran enfant.
    await page.getByRole('button', { name: 'Changer' }).click();
    await page.goto('/reglages');
    await page.getByLabel('Importer un foyer').setInputFiles({
      name: 'foyer.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          v: 1,
          data: {
            id: 'foyer_e2e',
            nom: 'Foyer importé',
            pointsTaux: 10,
            minutesTaux: 5,
            codeEnfant: 'IMPORT',
            codeCoparent: 'COIMP',
            membres: [
              {
                id: 'membre_parent',
                role: 'parent',
                displayName: 'Parent',
                actif: true,
              },
              {
                id: 'membre_lea',
                role: 'enfant',
                displayName: 'Léa',
                actif: true,
              },
              {
                id: 'membre_tom',
                role: 'enfant',
                displayName: 'Tom',
                actif: true,
              },
            ],
            actes: [
              {
                id: 'acte_import',
                titre: 'Acte importé',
                description: 'venu du fichier',
                portee: 'perso',
                points: 10,
                minutesDirectes: 0,
                streak: null,
                actif: true,
                ordre: 1,
              },
            ],
            declarations: [],
            mouvements: [],
            streaks: {},
          },
        })
      ),
    });
    await page.getByRole('button', { name: 'Confirmer' }).click();
    await expect(
      page.getByText('2 enfants dans le foyer importé.')
    ).toBeVisible();

    await page.goto('/');
    await deverrouillerEnfant(page, { code: 'IMPORT', enfant: 'Léa' });
    // Le bandeau « prochain acte » et la liste portent le même titre :
    // cibler le listitem du catalogue, pas un getByText ambigu.
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Acte importé' })
    ).toBeVisible();
    await expect(page.getByText('Mettre la table')).toHaveCount(0);
    // La session enfant survit au reload : pas de nouveau code ni clic « Léa ».
    await page.reload();
    await expect(page.getByText('Bonjour Léa')).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Acte importé' })
    ).toBeVisible();
  });

  test('la fiche d’installation se propose quand le navigateur le permet', async ({
    page,
  }) => {
    await page.goto('/a-propos');
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      });
      window.dispatchEvent(event);
    });
    await expect(
      page.getByRole('region', { name: 'Installer l’application' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Installer' })).toBeVisible();
  });

  test('« Signaler un problème » part avec la version et l’écran', async ({
    page,
  }) => {
    await page.goto('/a-propos');
    const lien = page.getByRole('link', { name: 'Signaler un problème' });
    await expect(lien).toHaveAttribute(
      'href',
      /\/issues\/new\?template=bug\.yml/
    );
    const url = new URL((await lien.getAttribute('href')) ?? '');
    expect(url.searchParams.get('version')).toMatch(/^v\d+\.\d+\.\d+/);
    expect(url.searchParams.get('environnement')).toContain('écran ');
    expect(url.searchParams.get('environnement')).toContain('/a-propos');
  });

  test('les trois liens de la famille : sur l’accueil et « À propos », nulle part ailleurs', async ({
    page,
  }) => {
    const pied = page.locator('[data-dwc="app-footer"]');
    const liens = ['Code source', 'M’offrir un café', 'Signaler un problème'];

    for (const route of ['/', '/a-propos']) {
      await page.goto(route);
      await expect(pied, `pied de page attendu sur ${route}`).toBeVisible();
      for (const nom of liens) {
        await expect(
          pied.getByRole('link', { name: nom, exact: true }),
          `${nom} attendu une fois sur ${route}`
        ).toHaveCount(1);
      }
    }

    for (const route of ['/reglages', '/compte']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(pied, `pied de page interdit sur ${route}`).toHaveCount(0);
      for (const nom of liens) {
        await expect(
          page.getByRole('link', { name: nom, exact: true }),
          `${nom} ne doit pas être sur ${route}`
        ).toHaveCount(0);
      }
    }
  });

  test('la langue bascule, et le cadre suit', async ({ page }) => {
    await page.goto('/reglages');

    await page.getByRole('tab', { name: 'EN' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Settings'
    );
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  });
});
