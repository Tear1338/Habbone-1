'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-[#F92330]/10">
        <span className="text-[28px]">⚠️</span>
      </div>
      <div>
        <h1 className="text-[20px] font-bold text-white">
          Une erreur est survenue
        </h1>
        <p className="mt-2 text-[14px] text-[#BEBECE]/70">
          Quelque chose s&apos;est mal passé. Réessaie ou retourne à l&apos;accueil.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[6px] bg-[#2596FF] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#2976E8]"
        >
          Réessayer
        </button>
        <a
          href="/"
          className="rounded-[6px] border border-white/10 bg-white/5 px-5 py-2.5 text-[13px] font-bold text-[#BEBECE] transition hover:bg-white/10"
        >
          Accueil
        </a>
      </div>
    </main>
  )
}
