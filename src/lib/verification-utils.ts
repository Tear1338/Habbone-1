import { parseTimestamp } from '@/lib/date-utils';

export type VerificationStatusResponse = {
  verified?: boolean;
  error?: string;
};

export type VerificationRegenerateResponse = {
  code?: string;
  expiresAt?: string | null;
  alreadyVerified?: boolean;
  error?: string;
};

export function getVerificationExpiresAtMs(expiresAt?: string | null): number {
  if (!expiresAt) return 0;
  return parseTimestamp(expiresAt, { numeric: 'ms', numericString: 'parse' });
}

export function formatVerificationExpiryLabel(expiresAt?: string | null): string | null {
  const timestamp = getVerificationExpiresAtMs(expiresAt);
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString();
}

export function formatCountdownFromMs(diffMs: number): string {
  const safe = Math.max(0, diffMs);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export async function postVerificationStatus(payload: {
  nick: string;
  code: string;
}): Promise<{ ok: boolean; status: number; data: VerificationStatusResponse }> {
  const res = await fetch('/api/verify/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as VerificationStatusResponse;
  return { ok: res.ok, status: res.status, data };
}

export async function postVerificationRegenerate(payload: {
  nick: string;
  hotel: string;
}): Promise<{ ok: boolean; status: number; data: VerificationRegenerateResponse }> {
  const res = await fetch('/api/verify/regenerate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as VerificationRegenerateResponse;
  return { ok: res.ok, status: res.status, data };
}
