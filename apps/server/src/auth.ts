import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from 'jose';
import { CHARACTERS, isCharacterAllowed, isThemeAllowed } from '@take6/shared';
import { env } from './env';
import { prisma } from './db';

export interface Identity {
  /** Private, stable key: `u:<supabase uid>` or `g:<guest id>`. Never sent to other players. */
  key: string;
  userId: string | null;
  email: string | null;
  isGuest: boolean;
  isPlus: boolean;
  name: string;
  avatar: string;
  cardTheme: string;
}

const jwks = env.supabaseUrl
  ? createRemoteJWKSet(new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`))
  : null;
const hsSecret = env.supabaseJwtSecret ? new TextEncoder().encode(env.supabaseJwtSecret) : null;

interface SupabaseClaims extends JWTPayload {
  email?: string;
  user_metadata?: { full_name?: string; name?: string; user_name?: string };
}

export async function verifyAccessToken(token: string | undefined | null): Promise<SupabaseClaims | null> {
  if (!token) return null;
  try {
    const { alg } = decodeProtectedHeader(token);
    if (alg === 'HS256') {
      if (!hsSecret) return null;
      return (await jwtVerify(token, hsSecret, { audience: 'authenticated' })).payload as SupabaseClaims;
    }
    if (!jwks) return null;
    return (await jwtVerify(token, jwks, { audience: 'authenticated' })).payload as SupabaseClaims;
  } catch {
    return null;
  }
}

export const cleanName = (raw: unknown, fallback: string) => {
  const name = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  return name || fallback;
};

const cleanGuestId = (raw: unknown) => String(raw ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);

export async function resolveIdentity(auth: Record<string, unknown>): Promise<Identity> {
  const claims = await verifyAccessToken(auth.token as string | undefined);
  const requestedAvatar = String(auth.avatar ?? '');
  const requestedTheme = String(auth.cardTheme ?? 'classic');

  if (claims?.sub) {
    const meta = claims.user_metadata ?? {};
    const suggested = cleanName(meta.full_name || meta.name || meta.user_name || claims.email?.split('@')[0], 'Player');
    const profile = prisma
      ? await prisma.profile.upsert({
          where: { id: claims.sub },
          update: {},
          create: {
            id: claims.sub,
            email: claims.email ?? null,
            displayName: cleanName(auth.name, suggested),
            avatar: isCharacterAllowed(requestedAvatar, false) ? requestedAvatar : 'bruno',
          },
        })
      : null;
    const isPlus = profile?.isPlus ?? false;
    return {
      key: `u:${claims.sub}`,
      userId: claims.sub,
      email: claims.email ?? null,
      isGuest: false,
      isPlus,
      name: profile?.displayName ?? cleanName(auth.name, suggested),
      avatar: profile?.avatar ?? (isCharacterAllowed(requestedAvatar, false) ? requestedAvatar : 'bruno'),
      cardTheme: profile?.cardTheme ?? 'classic',
    };
  }

  const guestId = cleanGuestId(auth.guestId) || Math.random().toString(36).slice(2);
  return {
    key: `g:${guestId}`,
    userId: null,
    email: null,
    isGuest: true,
    isPlus: false,
    name: cleanName(auth.name, `Guest ${guestId.slice(-4).toUpperCase()}`),
    avatar: isCharacterAllowed(requestedAvatar, false) ? requestedAvatar : CHARACTERS[0].id,
    cardTheme: isThemeAllowed(requestedTheme, false) ? requestedTheme : 'classic',
  };
}

/** Express helper: resolves the bearer token to a Supabase user id. */
export async function userFromRequest(header: string | undefined) {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const claims = await verifyAccessToken(token);
  return claims?.sub ? { id: claims.sub, email: claims.email ?? null } : null;
}
