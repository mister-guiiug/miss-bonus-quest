import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { createStore } from '@mister-guiiug/dev-pwa-config/storage';
import {
  createSyncQueue,
  type SyncQueue,
} from '@mister-guiiug/dev-pwa-config/sync-queue';
import {
  createChannel,
  type Channel,
} from '@mister-guiiug/dev-pwa-config/realtime';
import {
  supabaseRealtimeTransport,
  type SupabaseChange,
} from '@mister-guiiug/dev-pwa-config/realtime/supabase';
import { coverage } from '../../backend/index.ts';
import { supabase } from '../../backend/supabase.ts';
import { hashCode } from './codes.ts';
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
  ): Promise<{
    data: unknown;
    error: { message: string; code?: string } | null;
  }>;
  channel: (name: string) => unknown;
  removeChannel: (channel: unknown) => unknown;
};

export function syncDisponible(): boolean {
  return coverage.kind === 'supabase' && supabase.missing().length === 0;
}

function normaliserFoyer(parsed: ReturnType<typeof foyerSchema.parse>): Foyer {
  return {
    ...parsed,
    updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
  };
}

export async function pousserFoyer(foyer: Foyer): Promise<string | null> {
  if (!syncDisponible()) return 'sync-indisponible';
  try {
    const client = (await supabase.getClient()) as unknown as Client;
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return 'sync-indisponible';

    const updatedAt = foyer.updatedAt ?? new Date().toISOString();
    const [codeEnfant, codeCoparent] = await Promise.all([
      hashCode(foyer.codeEnfant),
      hashCode(foyer.codeCoparent),
    ]);
    const { error } = await client.from('foyer_snapshots').upsert(
      {
        id: foyer.id,
        owner_id: foyer.ownerAuthId ?? user.id,
        code_enfant: codeEnfant,
        code_coparent: codeCoparent,
        payload: foyer,
        updated_at: updatedAt,
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
    return normaliserFoyer(foyerSchema.parse(data.payload));
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
    if (error) {
      if (error.message?.includes('rate-limit')) return 'sync-rate-limit';
      log.error('rejoindre par code', { cause: error });
      return 'code-invalide';
    }
    if (!data) return 'code-invalide';
    return normaliserFoyer(foyerSchema.parse(data));
  } catch (cause) {
    log.error('rejoindre par code', { cause });
    return 'sync-echec';
  }
}

/** Transfert de propriétaire (RPC) — l’appelant doit être owner_id. */
export async function transfererPropriete(
  foyerId: string,
  nouveauAuthId: string
): Promise<string | null> {
  if (!syncDisponible()) return 'sync-indisponible';
  try {
    const client = (await supabase.getClient()) as unknown as Client;
    const { error } = await client.rpc('foyer_transferer_propriete', {
      p_id: foyerId,
      p_nouveau: nouveauAuthId,
    });
    if (error) {
      log.error('transferer propriete', { cause: error });
      return 'sync-echec';
    }
    return null;
  } catch (cause) {
    log.error('transferer propriete', { cause });
    return 'sync-echec';
  }
}

/** Co-parent connecté : s’ajoute à co_owner_ids et reçoit le payload. */
export async function rejoindreCoparent(code: string): Promise<Foyer | string> {
  if (!syncDisponible()) return 'sync-indisponible';
  try {
    const client = (await supabase.getClient()) as unknown as Client;
    const { data, error } = await client.rpc('foyer_rejoindre_coparent', {
      p_code: code.trim().toUpperCase(),
    });
    if (error || !data) {
      log.error('rejoindre coparent', { cause: error });
      return 'code-invalide';
    }
    return normaliserFoyer(foyerSchema.parse(data));
  } catch (cause) {
    log.error('rejoindre coparent', { cause });
    return 'sync-echec';
  }
}

let pushQueue: SyncQueue<Foyer> | null = null;

export function foyerPushQueue(): SyncQueue<Foyer> {
  if (pushQueue) return pushQueue;
  pushQueue = createSyncQueue<Foyer>({
    store: createStore('miss-bonus-quest_sync'),
    keyOf: foyer => foyer.id,
    process: async foyer => {
      const err = await pousserFoyer(foyer);
      if (err) throw new Error(err);
    },
    onDead: (entry, error) => {
      log.error('push foyer lettre morte', {
        id: entry.id,
        cause: error,
      });
    },
  });
  return pushQueue;
}

export function enfilerPush(foyer: Foyer): void {
  if (!syncDisponible()) return;
  const q = foyerPushQueue();
  q.enqueue(foyer);
  if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
    void q.flush().catch(cause => log.error('flush push', { cause }));
  }
}

export async function ecouterFoyer(
  foyerId: string,
  onPayload: (foyer: Foyer) => void
): Promise<Channel<string> | null> {
  if (!syncDisponible()) return null;
  const client = (await supabase.getClient()) as unknown as Client;

  const transport = supabaseRealtimeTransport({
    client: {
      channel: name => client.channel(name),
      removeChannel: ch => client.removeChannel(ch),
      from: table => client.from(table),
    },
    table: 'foyer_snapshots',
    event: 'UPDATE',
    filter: `id=eq.${foyerId}`,
    channelName: `foyer:${foyerId}`,
  });

  const channel = createChannel<SupabaseChange, string>({
    connect: transport.connect,
    cursorOf: transport.cursorOf,
    catchUp: transport.catchUp,
    onMessage: change => {
      const row = change.new;
      if (!row?.payload) return;
      try {
        onPayload(normaliserFoyer(foyerSchema.parse(row.payload)));
      } catch (cause) {
        log.error('payload realtime invalide', { cause });
      }
    },
    onStatus: status => {
      log.info('realtime foyer', { status });
    },
  });

  await channel.start();
  return channel;
}
