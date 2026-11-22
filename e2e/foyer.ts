import type { Page } from '@playwright/test';

/** Premier lancement : porte + formulaire de création (défauts Léa/Tom). */
export async function passerPorte(page: Page) {
  const creer = page.getByRole('button', { name: 'Créer mon foyer' });
  if (await creer.isVisible().catch(() => false)) {
    await creer.click();
  }
  const valider = page.getByRole('button', { name: 'Créer le foyer' });
  if (await valider.isVisible().catch(() => false)) {
    await valider.click();
  }
}

/** Déverrouille la porte enfant (code d’invitation), puis éventuellement choisit un profil. */
export async function deverrouillerEnfant(
  page: Page,
  opts: { code?: string; enfant?: string } = {}
) {
  await passerPorte(page);
  const code = opts.code ?? 'BONUS';
  await page.getByLabel('Code foyer').fill(code);
  await page.getByRole('button', { name: 'Déverrouiller' }).click();
  if (opts.enfant) {
    await page.getByRole('button', { name: opts.enfant }).click();
  }
}
