import { config } from './config';
import { supabase } from './supabase';

async function authHeader(): Promise<Record<string, string>> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${config.serverUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(await authHeader()), ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  return body as T;
}

export interface ServerConfig {
  features: { db: boolean; auth: boolean; payments: boolean };
  plusPrice: { amount: number; currency: string } | null;
}

export const formatPrice = (p: { amount: number; currency: string } | null | undefined) =>
  p ? new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency.toUpperCase() }).format(p.amount / 100) : null;
