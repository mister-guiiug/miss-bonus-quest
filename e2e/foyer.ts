import type { Page } from '@playwright/test';

/** Déverrouille la porte enfant (code d’invitation), puis éventuellement choisit un profil. */
export async function deverrouillerEnfant(
  page: Page,
  opts: { code?: string; enfant?: string } = {}
) {
  const code = opts.code ?? 'BONUS';
  await page.getByLabel('Code foyer').fill(code);
  await page.getByRole('button', { name: 'Déverrouiller' }).click();
  if (opts.enfant) {
    await page.getByRole('button', { name: opts.enfant }).click();
  }
}
