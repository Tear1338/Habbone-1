'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  formatCountdownFromMs,
  formatVerificationExpiryLabel,
  getVerificationExpiresAtMs,
  postVerificationRegenerate,
  postVerificationStatus,
} from '@/lib/verification-utils';
import { postRegister } from '@/lib/register-utils';

export default function RegisterPage() {
  const router = useRouter();

  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [missao, setMissao] = useState('Mission Habbo: HabboOneRegister-0');
  const [hotel, setHotel] = useState<'fr' | 'com' | 'com.br'>('fr');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verification, setVerification] = useState<{
    code: string;
    expiresAt: string | null;
    hotel: string;
    nick: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  const expiresLabel = useMemo(
    () => formatVerificationExpiryLabel(verification?.expiresAt),
    [verification?.expiresAt],
  );

  useEffect(() => {
    if (!verification?.expiresAt) {
      setCountdown(null);
      return;
    }
    const target = getVerificationExpiresAtMs(verification.expiresAt);
    if (!target) {
      setCountdown(null);
      return;
    }
    let notified = false;
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdown('00:00');
        if (!notified) {
          setStatusMessage('Code expiré. Régénérez un code.');
          notified = true;
        }
        return true;
      }
      setCountdown(formatCountdownFromMs(diff));
      return false;
    };
    tick();
    const id = setInterval(() => {
      if (tick()) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [verification?.expiresAt]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        nick: nick.trim(),
        password,
        hotel,
        missao: missao.trim() || undefined,
      };
      const { ok, data } = await postRegister(payload);

      if (!ok) {
        setError(data?.error || 'Inscription impossible.');
        return;
      }

      const code = data?.verification?.code as string | undefined;
      const expiresAt = data?.verification?.expiresAt as string | undefined;
      const verificationHotel = (data?.verification?.hotel as string | undefined) || hotel;
      if (!code) {
        setError("Code de vérification manquant. Veuillez réessayer.");
        return;
      }

      setVerification({
        code,
        expiresAt: expiresAt || null,
        hotel: verificationHotel,
        nick: nick.trim(),
      });
      setCountdown(null);
      setStatusMessage(
        `Ajoutez le code à votre mission Habbo puis cliquez sur “Vérifier mon compte”.`
      );
      setStep('verify');
    } catch (e: any) {
      setError(e?.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    if (!verification || checking) return;
    const expiresAtMs = getVerificationExpiresAtMs(verification.expiresAt);
    if (expiresAtMs && expiresAtMs <= Date.now()) {
      setStatusMessage('Code expiré. Régénérez un code.');
      return;
    }
    setChecking(true);
    setStatusMessage(null);
    try {
      const { ok, status, data } = await postVerificationStatus({
        nick: verification.nick,
        code: verification.code,
      });
      if (!ok) {
        if (status === 410) {
          setStatusMessage(data?.error || 'Code expiré. Régénérez un code.');
        } else {
          setStatusMessage(data?.error || 'Vérification impossible pour le moment.');
        }
        return;
      }
      if (data?.verified) {
        setVerified(true);
        setStatusMessage('Compte vérifié ! Connexion en cours…');
        const login = await signIn('credentials', {
          redirect: false,
          nick: verification.nick,
          password,
        });
        if (login?.error) {
          setStatusMessage(login.error || 'Connexion impossible. Veuillez essayer via /login.');
          return;
        }
        router.push('/');
        router.refresh();
      } else {
        setStatusMessage('Le code n’est pas encore détecté. Réessayez dans quelques secondes.');
      }
    } catch (error: any) {
      setStatusMessage(error?.message || 'Erreur de vérification.');
    } finally {
      setChecking(false);
    }
  }

  async function regenerateCode() {
    if (!verification || regenerating) return;
    setRegenerating(true);
    setStatusMessage(null);
    try {
      const { ok, data } = await postVerificationRegenerate({
        nick: verification.nick,
        hotel: verification.hotel,
      });
      if (!ok) {
        setStatusMessage(data?.error || 'Impossible de régénérer le code pour le moment.');
        return;
      }
      const code = data?.code as string | undefined;
      if (!code) {
        setStatusMessage('Ce compte est déjà vérifié ou ne nécessite plus de code.');
        if (data?.alreadyVerified) {
          setVerified(true);
        }
        return;
      }
      setVerification((prev) =>
        prev
          ? {
              ...prev,
              code,
              expiresAt: data?.expiresAt || null,
            }
          : prev
      );
      setCountdown(null);
      setStatusMessage('Nouveau code généré. Pensez à mettre à jour votre mission.');
    } catch (error: any) {
      setStatusMessage(error?.message || 'Erreur lors de la régénération du code.');
    } finally {
      setRegenerating(false);
    }
  }

  if (step === 'verify' && verification) {
    return (
      <main className="max-w-md mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Vérification du compte</h1>
        <p className="text-sm opacity-80">
          Pour confirmer que vous êtes bien le propriétaire du compte Habbo{' '}
          <strong>{verification.nick}</strong>, ajoutez le code ci-dessous dans votre mission Habbo (
          {verification.hotel === 'fr' ? 'Habbo.fr' : verification.hotel === 'com' ? 'Habbo.com' : 'Habbo.com.br'})
          puis cliquez sur « Vérifier mon compte ».
        </p>

        <div className="rounded border border-white/10 bg-white/5 p-4 space-y-3">
          <div>
            <p className="text-xs uppercase opacity-70">Code de vérification</p>
            <code className="text-lg font-semibold">{verification.code}</code>
          </div>
          {(verification.expiresAt && (countdown || expiresLabel)) && (
            <p className="text-xs opacity-70">
              Expire {countdown ? `dans ${countdown} ` : ''}
              {expiresLabel ? <span className="font-medium">({expiresLabel})</span> : null}
            </p>
          )}
        </div>

        {statusMessage && (
          <div className="text-sm border border-white/10 rounded p-3 bg-white/5">
            {statusMessage}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void checkStatus()}
            disabled={checking || verified}
            className={cn(
              'w-full rounded px-4 py-2 font-medium',
              checking || verified
                ? 'bg-white/40 text-black/60 cursor-not-allowed'
                : 'bg-white text-black hover:opacity-90'
            )}
          >
            {verified ? 'Compte vérifié' : checking ? 'Vérification…' : 'Vérifier mon compte'}
          </button>
          <button
            type="button"
            onClick={() => void regenerateCode()}
            disabled={regenerating}
            className="w-full rounded px-4 py-2 border border-white/20 hover:border-white/40"
          >
            {regenerating ? 'Génération…' : 'Régénérer un code'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('form');
              setStatusMessage(null);
              setVerification(null);
              setCountdown(null);
            }}
            className="w-full rounded px-4 py-2 border border-transparent text-sm opacity-70 hover:opacity-100"
          >
            Revenir au formulaire
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Créer un compte</h1>

      {error && (
        <div className="text-sm text-red-500 border border-red-500/30 rounded p-3 bg-red-500/10">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="nick" className="text-sm opacity-80">Pseudo Habbo</label>
          <input
            id="nick"
            name="nick"
            type="text"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            className="w-full rounded px-3 py-2 bg-transparent border"
            placeholder="Votre pseudo"
            autoComplete="username"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm opacity-80">Mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded px-3 py-2 bg-transparent border"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1">
          <span className="text-sm opacity-80">Hôtel Habbo</span>
          <div className="flex items-center gap-3 text-sm">
            {(['fr', 'com', 'com.br'] as const).map((value) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="hotel"
                  value={value}
                  checked={hotel === value}
                  onChange={() => setHotel(value)}
                />
                <span>
                  {value === 'fr' ? 'Habbo.fr' : value === 'com' ? 'Habbo.com' : 'Habbo.com.br'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="missao" className="text-sm opacity-80">Missao (optionnel)</label>
          <input
            id="missao"
            name="missao"
            type="text"
            value={missao}
            onChange={(e) => setMissao(e.target.value)}
            className="w-full rounded px-3 py-2 bg-transparent border"
            placeholder="Mission Habbo: HabboOneRegister-0"
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded px-4 py-2 bg-white text-black font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Création…' : 'Créer le compte'}
        </button>
      </form>

      <p className="text-sm opacity-80">
        Déjà un compte ?{' '}
        <Link href="/login" className="underline">Se connecter</Link>
      </p>
    </main>
  );
}
