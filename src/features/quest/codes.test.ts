import { describe, expect, it } from 'vitest';
import { hashCode } from './codes.ts';

describe('hashCode', () => {
  it('normalise la casse et produit un hex SHA-256', async () => {
    const a = await hashCode('bonus');
    const b = await hashCode('BONUS');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
