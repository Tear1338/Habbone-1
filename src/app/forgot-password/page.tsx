'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { KeyRound, Copy, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [nick, setNick] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !nick.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/user/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', nick: nick.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur')
      setCode(data.code || '')
      setStep('reset')
      toast.success('Code genere ! Place-le dans ta mission Habbo.')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (newPassword.length < 6) {
      toast.error('Mot de passe trop court (min 6 caracteres)')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/user/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', nick: nick.trim(), code, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur')
      toast.success('Mot de passe reinitialise ! Tu peux te connecter.')
      router.push('/')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="mx-auto w-full max-w-[500px] space-y-6 px-4 py-10 sm:px-6">
      <header className="flex h-[76px] items-center rounded-[4px] border border-black/60 bg-[#1F1F3E] px-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          <KeyRound className="h-[28px] w-[28px] text-[#DDD]" />
          <h1 className="text-[18px] font-bold uppercase text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Mot de passe oublie
          </h1>
        </div>
      </header>

      {step === 'request' && (
        <section className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-6">
          <p className="mb-5 text-[13px] leading-relaxed text-[#BEBECE]/80">
            Entre ton pseudo Habbo. On va generer un code que tu devras placer dans ta <strong className="text-white">mission Habbo</strong> pour prouver que c&apos;est bien ton compte.
          </p>

          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]/70">
                Pseudo Habbo
              </label>
              <input
                type="text"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                required
                minLength={2}
                placeholder="Ton pseudo Habbo"
                className="h-[45px] w-full rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[14px] text-white placeholder:text-[#BEBECE]/40 focus:border-[#2596FF] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-[45px] w-full items-center justify-center rounded-[4px] bg-[#2596FF] text-[12px] font-bold uppercase tracking-[0.04em] text-white transition hover:bg-[#2976E8] disabled:opacity-50"
            >
              {loading ? 'Generation...' : 'Generer le code'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/" className="text-[12px] text-[#BEBECE]/60 hover:text-[#2596FF]">
              Retour a l&apos;accueil
            </Link>
          </div>
        </section>
      )}

      {step === 'reset' && (
        <section className="space-y-4">
          {/* Code display */}
          <div className="rounded-[4px] border border-[#2596FF]/30 bg-[#1F1F3E] p-5">
            <p className="mb-3 text-[13px] text-[#BEBECE]/80">
              Place ce code dans ta <strong className="text-white">mission Habbo</strong> puis clique sur &quot;Reinitialiser&quot; :
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-[4px] border border-[#2596FF]/20 bg-[#141433] px-4 py-3 text-center font-mono text-[18px] font-bold tracking-[0.1em] text-[#2596FF]">
                {code}
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded-[4px] border border-[#141433] bg-[#25254D] transition hover:bg-[#303060]"
                title="Copier le code"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-[#0FD52F]" /> : <Copy className="h-4 w-4 text-[#BEBECE]" />}
              </button>
            </div>
          </div>

          {/* Reset form */}
          <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-6">
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]/70">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimum 6 caracteres"
                  className="h-[45px] w-full rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[14px] text-white placeholder:text-[#BEBECE]/40 focus:border-[#2596FF] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]/70">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Retape le mot de passe"
                  className="h-[45px] w-full rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[14px] text-white placeholder:text-[#BEBECE]/40 focus:border-[#2596FF] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-[45px] w-full items-center justify-center rounded-[4px] bg-[#0FD52F] text-[12px] font-bold uppercase tracking-[0.04em] text-white transition hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={() => { setStep('request'); setCode(''); }}
            className="w-full text-center text-[12px] text-[#BEBECE]/60 hover:text-[#2596FF]"
          >
            Regenerer un nouveau code
          </button>
        </section>
      )}
    </main>
  )
}
