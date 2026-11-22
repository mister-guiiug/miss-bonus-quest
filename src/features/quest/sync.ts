import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { coverage } from '../../backend/index.ts';
import { supabase } from '../../backend/supabase.ts';
import { foyerSchema } from './schema.ts';
import type { Foyer } from './types.ts';

const log = createLogger('quest-sync');

type Client = {
  auth: {
    getUser(): Promise<{ data: { user: { id: string } | null } }>;
  };
  from(table: string): {
    upsert(
      row: Record<string, unknown>,
      opts: { onConflict: string }
    ): Promise<{ error: { message: string } | null }>;
    select(columns: string): {
      eq(
        column: string,
        value: string
      ): {
        maybeSingle(): Promise<{
          data: { payload: unknown } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  rpc(
    fn: string,
    args?: Record<string, unknown>
  ): Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
};

/**
 * Sync foyer par instantané JSON (ADR 0014).
 * Sans projet Supabase configuré : indisponible, le magasin local reste la source.
 */
export function syncDisponible(): boolean {
  return coverage.kind === 'supabase' && supabase.missing().length === 0;
}

export async function pousserFoyer(foyer: Foyer): Promise<string | null> {
  if (!syncDisponible()) return 'sync-indisponible';
  try {
    const client = (await supabase.getClient()) as unknown as Client;
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return 'sync-indisponible';

    const { error } = await client.from('foyer_snapshots').upsert(
      {
        id: foyer.id,
        owner_id: user.id,
        code_enfant: foyer.codeEnfant.toUpperCase(),
        code_coparent: foyer.codeCoparent.toUpperCase(),
        payload: foyer,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      log.error('pousser foyer', { cause: error });
      return 'sync-echec';
    }
    return null;
  } catch (cause) {
    log.error('pousser foyer', { cause });
    return 'sync-echec';
  }
}

export async function tirerFoyer(foyerId: string): Promise<Foyer | string> {
  if (!syncDisponible()) return 'sync-indisponible';
  try {
    const client = (await supabase.getClient()) as unknown as Client;
    const { data, error } = await client
      .from('foyer_snapshots')
      .select('payload')
      .eq('id', foyerId)
      .maybeSingle();
    if (error || !data?.payload) {
      log.error('tirer foyer', { cause: error });
      return 'sync-echec';
    }
    return foyerSchema.parse(data.payload);
  } catch (cause) {
    log.error('tirer foyer', { cause });
    return 'sync-echec';
  }
}

export async function rejoindreParCode(code: string): Promise<Foyer | string> {
  if (!syncDisponible()) return 'sync-indisponible';
  try {
    const client = (await supabase.getClient()) as unknown as Client;
    const { data, error } = await client.rpc('foyer_par_code', {
      p_code: code.trim().toUpperCase(),
    });
    if (error || !data) {
      log.error('rejoindre par code', { cause: error });
      return 'code-invalide';
    }
    return foyerSchema.parse(data);
  } catch (cause) {
    log.error('rejoindre par code', { cause });
    return 'sync-echec';
  }
}
