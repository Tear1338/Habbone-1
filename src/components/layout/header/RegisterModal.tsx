'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/lib/sonner'
import { cn } from '@/lib/utils'
import {
  formatCountdownFromMs,
  formatVerificationExpiryLabel,
  getVerificationExpiresAtMs,
  postVerificationRegenerate,
  postVerificationStatus,
} from '@/lib/verification-utils'
import { postRegister } from '@/lib/register-utils'
import { signIn } from 'next-auth/react'
import { AlertTriangle, CheckCircle2, Info, RefreshCcw, Sparkles } from 'lucide-react'

type RegistrationFormState = {
  nick: string
  email: string
  password: string
  hotel: 'fr' | 'com' | 'com.br'
}

type VerificationState = {
  nick: string
  code: string
  expiresAt: string | null
  hotel: string
}

type StatusState = { type: 'info' | 'error' | 'success'; message: string } | null

const HOTEL_OPTIONS: RegistrationFormState['hotel'][] = ['fr', 'com', 'com.br']

type RegistrationCompletePayload = {
  verification: VerificationState
  password: string
}

function createInitialForm(): RegistrationFormState {
  return {
    nick: '',
    email: '',
    password: '',
    hotel: 'fr',
  }
}

function useRegistrationForm(
  setStatus: (status: StatusState) => void,
  onRegistered: (payload: RegistrationCompletePayload) => void
) {
  const [form, setForm] = useState<RegistrationFormState>(() => createInitialForm())
  const [submitting, setSubmitting] = useState(false)

  const updateField = useCallback(<K extends keyof RegistrationFormState>(field: K, value: RegistrationFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleInputChange = useCallback(
    (field: keyof RegistrationFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      updateField(field, event.target.value as RegistrationFormState[typeof field])
    },
    [updateField]
  )

  const handleHotelChange = useCallback(
    (value: RegistrationFormState['hotel']) => {
      updateField('hotel', value)
    },
    [updateField]
  )

  const reset = useCallback(() => {
    setForm(createInitialForm())
    setSubmitting(false)
  }, [])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (submitting) return

      setSubmitting(true)
      setStatus(null)

      try {
        const payload = {
          nick: form.nick.trim(),
          password: form.password,
          email: form.email.trim() || undefined,
          hotel: form.hotel,
        }

        const { ok, data } = await postRegister(payload)

        if (!ok) {
          const message = (data as any)?.error || 'Inscription impossible pour le moment.'
          setStatus({ type: 'error', message })
          try { await toastError(message) } catch {}
          return
        }

        const code = (data as any)?.verification?.code as string | undefined
        if (!code) {
          const message = 'Code de vérification manquant. Réessayez.'
          setStatus({ type: 'error', message })
          try { await toastError(message) } catch {}
          return
        }

        const verification: VerificationState = {
          nick: payload.nick,
          code,
          expiresAt: (data as any)?.verification?.expiresAt || null,
          hotel: (data as any)?.verification?.hotel || payload.hotel,
        }

        setStatus({ type: 'info', message: 'Ajoute le code à ta mission Habbo puis lance la vérification.' })
        onRegistered({ verification, password: payload.password })
        try { await toastSuccess('Compte créé. Vérifie ta mission pour l’activer.') } catch {}
      } catch (error: any) {
        const message = error?.message || "Erreur lors de l'inscription."
        setStatus({ type: 'error', message })
        try { await toastError(message) } catch {}
      } finally {
        setSubmitting(false)
      }
    },
    [form, onRegistered, setStatus, submitting]
  )

  return {
    form,
    submitting,
    handleInputChange,
    handleHotelChange,
    handleSubmit,
    reset,
  }
}

type UseVerificationFlowArgs = {
  verification: VerificationState | null
  password: string
  setVerification: React.Dispatch<React.SetStateAction<VerificationState | null>>
  setStatus: (status: StatusState) => void
  onClose: () => void
}

function useVerificationFlow({
  verification,
  password,
  setVerification,
  setStatus,
  onClose,
}: UseVerificationFlowArgs) {
  const [countdown, setCountdown] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (!verification?.expiresAt) {
      setCountdown(null)
      return
    }
    const target = getVerificationExpiresAtMs(verification.expiresAt)
    if (!target) {
      setCountdown(null)
      return
    }
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) {
        setCountdown('00:00')
        setStatus({ type: 'error', message: 'Code expiré. Régénère un code.' })
        return true
      }
      setCountdown(formatCountdownFromMs(diff))
      return false
    }
    tick()
    const interval = setInterval(() => {
      if (tick()) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [setStatus, verification?.expiresAt])

  useEffect(() => {
    setVerified(false)
  }, [verification?.code])

  const handleCheckStatus = useCallback(async () => {
    if (!verification || checking) return

    const expiresAtMs = getVerificationExpiresAtMs(verification.expiresAt)
    if (expiresAtMs && expiresAtMs <= Date.now()) {
      setStatus({ type: 'error', message: 'Code expiré. Régénère un code.' })
      return
    }

    setChecking(true)
    setStatus(null)

    try {
      const { ok, status, data } = await postVerificationStatus({
        nick: verification.nick,
        code: verification.code,
      })

      if (!ok) {
        const message =
          status === 410
            ? (data as any)?.error || 'Code expiré. Régénère un code.'
            : (data as any)?.error || 'Vérification impossible pour le moment.'
        setStatus({ type: 'error', message })
        return
      }

      if (data?.verified) {
        setVerified(true)
        setStatus({ type: 'success', message: 'Compte vérifié ! Connexion en cours…' })
        try {
          const login = await signIn('credentials', {
            redirect: false,
            nick: verification.nick,
            password,
          })
          if (login?.error) {
            setStatus({ type: 'error', message: login.error || 'Connexion impossible. Essaie via /login.' })
            return
          }
          await toastSuccess('Connexion réussie.')
          onClose()
        } catch (error: any) {
          setStatus({ type: 'error', message: error?.message || 'Erreur de connexion.' })
        }
      } else {
        setStatus({ type: 'info', message: 'Le code n’est pas encore détecté. Réessaie dans quelques secondes.' })
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: error?.message || 'Erreur de vérification.' })
    } finally {
      setChecking(false)
    }
  }, [checking, onClose, password, setStatus, verification])

  const handleRegenerate = useCallback(async () => {
    if (!verification || regenerating) return
    setRegenerating(true)
    setStatus(null)

    try {
      const { ok, data } = await postVerificationRegenerate({
        nick: verification.nick,
        hotel: verification.hotel,
      })

      if (!ok) {
        const message = (data as any)?.error || 'Impossible de régénérer le code.'
        setStatus({ type: 'error', message })
        return
      }

      if (data?.alreadyVerified) {
        setVerified(true)
        setStatus({ type: 'success', message: 'Ce compte est déjà vérifié.' })
        return
      }

      const code = data?.code as string | undefined
      if (!code) {
        setStatus({ type: 'error', message: 'Code introuvable. Réessaie plus tard.' })
        return
      }

      setVerification((prev) =>
        prev
          ? {
              ...prev,
              code,
              expiresAt: data?.expiresAt || null,
            }
          : prev
      )
      setCountdown(null)
      setStatus({ type: 'info', message: 'Nouveau code généré. Mets-le à jour dans ta mission.' })
    } catch (error: any) {
      setStatus({ type: 'error', message: error?.message || 'Erreur lors de la régénération.' })
    } finally {
      setRegenerating(false)
    }
  }, [regenerating, setStatus, setVerification, verification])

  const reset = useCallback(() => {
    setCountdown(null)
    setChecking(false)
    setRegenerating(false)
    setVerified(false)
  }, [])

  return {
    countdown,
    checking,
    regenerating,
    verified,
    handleCheckStatus,
    handleRegenerate,
    reset,
  }
}

type StatusBannerProps = {
  status: StatusState
}

function StatusBanner({ status }: StatusBannerProps) {
  if (!status) return null

  const palette =
    status.type === 'success'
      ? {
          className: 'border-[#0FD52F]/40 bg-[#12361F] text-[#9DF4AD]',
          icon: <CheckCircle2 className="h-4 w-4 text-[#54F296]" />,
        }
      : status.type === 'error'
        ? {
            className: 'border-[#FF8A8A]/40 bg-[#3A1F2D] text-[#FFC0C0]',
            icon: <AlertTriangle className="h-4 w-4 text-[#FF8A8A]" />,
          }
        : {
            className: 'border-white/15 bg-white/5 text-white/80',
            icon: <Info className="h-4 w-4 text-white/70" />,
          }

  return (
    <div className={cn('rounded-[8px] border px-4 py-3 text-sm leading-relaxed', palette.className)}>
      <span className="inline-flex items-center gap-2">
        {palette.icon}
        {status.message}
      </span>
    </div>
  )
}

type RegisterFormProps = {
  form: RegistrationFormState
  submitting: boolean
  status: StatusState
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onFieldChange: (field: keyof RegistrationFormState) => (event: React.ChangeEvent<HTMLInputElement>) => void
  onHotelChange: (value: RegistrationFormState['hotel']) => void
}

function RegisterForm({
  form,
  submitting,
  status,
  onClose,
  onSubmit,
  onFieldChange,
  onHotelChange,
}: RegisterFormProps) {
  return (
    <DialogContent className="bg-[#0E0E22] text-white border border-white/10 rounded-[12px] sm:max-w-2xl p-0 shadow-[0_20px_60px_rgba(6,7,18,0.45)]">
      <div className="p-6 sm:p-8 space-y-6">
        <DialogHeader className="space-y-2 text-center">
          <DialogTitle className="text-2xl font-semibold text-white">Crée ton compte HabbOne</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-white/70">
            Entre ton pseudo Habbo, choisis un mot de passe et sélectionne ton hôtel pour commencer.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="w-full">
            <StatusBanner status={status} />
          </div>

          <div className="space-y-3">
            <label htmlFor="register-nick" className="block pb-1 text-sm font-medium text-white">
              Pseudo Habbo
            </label>
            <Input
              id="register-nick"
              name="nick"
              placeholder="Ex : MonPseudo"
              value={form.nick}
              onChange={onFieldChange('nick')}
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
              disabled={submitting}
              className="h-11 rounded-[6px] border-[#232356] bg-[#141433] text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-[#2596FF]"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="register-email" className="block pb-1 text-sm font-medium text-white">
              Email (optionnel)
            </label>
            <Input
              id="register-email"
              name="email"
              type="email"
              placeholder="email@exemple.fr"
              value={form.email}
              onChange={onFieldChange('email')}
              autoComplete="email"
              disabled={submitting}
              className="h-11 rounded-[6px] border-[#232356] bg-[#141433] text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-[#2596FF]"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="register-password" className="block pb-1 text-sm font-medium text-white">
              Mot de passe
            </label>
            <Input
              id="register-password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={onFieldChange('password')}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={submitting}
              className="h-11 rounded-[6px] border-[#232356] bg-[#141433] text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-[#2596FF]"
            />
          </div>

          <div className="space-y-2 text-sm text-white/80">
            <p className="font-medium text-center sm:text-left">Hôtel Habbo</p>
            <div className="flex flex-wrap justify-center gap-3 text-white/70">
              {HOTEL_OPTIONS.map((value) => {
                const selected = form.hotel === value
                return (
                  <label
                    key={value}
                    className={cn(
                      'flex items-center gap-2 rounded-[4px] border px-4 py-2 text-sm cursor-pointer transition-all',
                      selected ? 'border-[#0FD52F] bg-[#0FD52F]/10 text-white shadow-[0_0_0_1px_rgba(15,213,47,0.25)]' : 'border-white/15 bg-white/5 hover:border-white/30'
                    )}
                  >
                    <input
                      type="radio"
                      name="hotel"
                      value={value}
                      checked={selected}
                      onChange={() => onHotelChange(value)}
                      className="accent-[#0FD52F]"
                    />
                    <span>{value === 'fr' ? 'Habbo.fr' : value === 'com' ? 'Habbo.com' : 'Habbo.com.br'}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="text-xs text-white/60 text-center border-t border-white/10 pt-4">
            Nous ne demandons jamais ton mot de passe Habbo : ces données restent internes à HabbOne.
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex min-w-[200px] items-center justify-center gap-2 rounded-[6px] bg-[#0FD52F] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5 hover:brightness-95 sm:w-auto sm:flex-none"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="relative flex h-3 w-3 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/40" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-black" />
                  </span>
                  Inscription…
                </span>
              ) : (
                "S'inscrire"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="flex min-w-[200px] items-center justify-center rounded-[6px] text-sm text-white/70 hover:bg-white/5 hover:text-white sm:w-auto sm:flex-none"
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </DialogContent>
  )
}

type VerificationPanelProps = {
  verification: VerificationState
  status: StatusState
  countdown: string | null
  checking: boolean
  regenerating: boolean
  verified: boolean
  onCheck: () => void
  onRegenerate: () => void
  onBack: () => void
}

function VerificationPanel({
  verification,
  status,
  countdown,
  checking,
  regenerating,
  verified,
  onCheck,
  onRegenerate,
  onBack,
}: VerificationPanelProps) {
  const expiresLabel = useMemo(
    () => formatVerificationExpiryLabel(verification.expiresAt),
    [verification.expiresAt]
  )

  const steps = useMemo(
    () => [
      { id: 'edit', icon: Sparkles, label: 'Ouvre Habbo, édite ta mission et colle ce code tel quel.' },
      {
        id: 'check',
        icon: CheckCircle2,
        label: 'Reviens ici et clique sur « Vérifier mon compte ». La mise à jour peut prendre quelques secondes.',
      },
      { id: 'refresh', icon: RefreshCcw, label: 'Si le code expire, régénère-en un nouveau : l’ancien sera désactivé automatiquement.' },
    ],
    []
  )

  return (
    <DialogContent className="bg-[#0E0E22] text-white border border-white/10 rounded-[12px] sm:max-w-2xl p-0 shadow-[0_20px_60px_rgba(6,7,18,0.45)]">
      <div className="flex flex-col items-center p-6 sm:p-8 space-y-6 text-center">
        <DialogHeader className="space-y-2 text-center">
          <DialogTitle className="text-2xl font-semibold text-white">Vérification du compte</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-white/70">
            Ajoute le code à ta mission Habbo puis lance la vérification pour activer ton compte.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full rounded-[8px] border border-white/10 bg-[#141433] p-6">
          <p className="text-xs uppercase tracking-wide text-white/60">Code de vérification</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <span className="text-3xl font-semibold tracking-[0.3em] text-white">{verification.code}</span>
            {countdown || expiresLabel ? (
              <span className="text-xs text-white/60 text-center">
                {countdown ? `Expire dans ${countdown}` : null}
                {expiresLabel ? <span className="text-white/40"> ({expiresLabel})</span> : null}
              </span>
            ) : null}
          </div>
        </div>

        <div className="w-full space-y-3 text-sm text-white/75 text-left">
          <p className="text-lg font-semibold text-white">Que faire maintenant ?</p>
          <ol className="space-y-2">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <li key={step.id} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{step.label}</span>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="w-full">
          <StatusBanner status={status} />
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Button
            type="button"
            onClick={onCheck}
            disabled={checking || verified}
            className={cn(
              'flex min-w-[200px] items-center justify-center gap-2 rounded-[6px] bg-[#0FD52F] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5 hover:brightness-95 sm:w-auto sm:flex-none',
              (checking || verified) && 'opacity-60 cursor-not-allowed'
            )}
          >
            {verified ? (
              <>
                Compte vérifié
                <span className="text-lg leading-none">✓</span>
              </>
            ) : checking ? (
              <span className="inline-flex items-center gap-2">
                <span className="relative flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/40" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-black" />
                </span>
                Vérification…
              </span>
            ) : (
              <>
                Vérifier mon compte
                <span className="text-lg leading-none">→</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex min-w-[200px] items-center justify-center rounded-[6px] border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-white/10 sm:w-auto sm:flex-none"
          >
            {regenerating ? 'GÉNÉRATION…' : 'RÉGÉNÉRER UN CODE'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="flex min-w-[200px] items-center justify-center rounded-[6px] text-sm text-white/70 hover:bg-white/5 hover:text-white sm:w-auto sm:flex-none"
          >
            Revenir au formulaire
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

type RegisterModalProps = {
  open: boolean
  onClose: () => void
}

export default function RegisterModal({ open, onClose }: RegisterModalProps) {
  const [status, setStatus] = useState<StatusState>(null)
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [verification, setVerification] = useState<VerificationState | null>(null)
  const [authPassword, setAuthPassword] = useState('')

  const handleRegistered = useCallback((payload: RegistrationCompletePayload) => {
    setVerification(payload.verification)
    setAuthPassword(payload.password)
    setStep('verify')
  }, [])

  const {
    form,
    submitting,
    handleInputChange,
    handleHotelChange,
    handleSubmit,
    reset: resetForm,
  } = useRegistrationForm(setStatus, handleRegistered)

  const {
    countdown,
    checking,
    regenerating,
    verified,
    handleCheckStatus,
    handleRegenerate,
    reset: resetVerification,
  } = useVerificationFlow({
    verification,
    password: authPassword,
    setVerification,
    setStatus,
    onClose,
  })

  useEffect(() => {
    if (!open) {
      resetForm()
      resetVerification()
      setVerification(null)
      setAuthPassword('')
      setStatus(null)
      setStep('form')
    }
  }, [open, resetForm, resetVerification])

  const handleBackToForm = useCallback(() => {
    resetVerification()
    setVerification(null)
    setStatus(null)
    setStep('form')
  }, [resetVerification])

  if (step === 'verify' && verification) {
    return (
      <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
        <VerificationPanel
          verification={verification}
          status={status}
          countdown={countdown}
          checking={checking}
          regenerating={regenerating}
          verified={verified}
          onCheck={handleCheckStatus}
          onRegenerate={handleRegenerate}
          onBack={handleBackToForm}
        />
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
      <RegisterForm
        form={form}
        submitting={submitting}
        status={status}
        onClose={onClose}
        onSubmit={handleSubmit}
        onFieldChange={handleInputChange}
        onHotelChange={handleHotelChange}
      />
    </Dialog>
  )
}
