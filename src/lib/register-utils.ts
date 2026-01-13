export type RegisterPayload = {
  nick: string;
  password: string;
  hotel: 'fr' | 'com' | 'com.br';
  missao?: string;
  email?: string;
};

export type RegisterVerificationPayload = {
  code?: string;
  expiresAt?: string | null;
  hotel?: string;
};

export type RegisterResponse = {
  verification?: RegisterVerificationPayload;
  error?: string;
};

export async function postRegister(payload: RegisterPayload): Promise<{
  ok: boolean;
  status: number;
  data: RegisterResponse;
}> {
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as RegisterResponse;
  return { ok: res.ok, status: res.status, data };
}
