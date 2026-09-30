import { createClient } from '@insforge/sdk';
import { config } from './config';

/** Signed-in account as the app sees it (InsForge user ids are UUIDs). */
export interface AuthUser {
  id: string;
  email: string | null;
}

export const insforge = config.insforgeUrl ? createClient({ baseUrl: config.insforgeUrl, anonKey: config.insforgeAnonKey || undefined }) : null;

/**
 * Access token for our own game server (socket handshake + REST). Null for guests —
 * the anon key is never forwarded, so the server treats the request as a guest.
 */
export async function accessToken(): Promise<string | null> {
  if (!insforge) return null;
  try {
    const token = await insforge.getHttpClient().getValidAccessToken();
    return token && token !== config.insforgeAnonKey ? token : null;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<AuthUser | null> {
  if (!insforge) return null;
  const { data } = await insforge.auth.getCurrentUser();
  const u = data?.user;
  return u ? { id: u.id, email: u.email ?? null } : null;
}
