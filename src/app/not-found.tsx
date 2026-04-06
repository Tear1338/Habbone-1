import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[1200px] flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      {/* Habbo avatar lost */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://www.habbo.fr/habbo-imaging/avatarimage?user=&direction=2&head_direction=3&gesture=sad&action=wav&size=l&img_format=png"
        alt="Avatar perdu"
        className="mb-6 h-[130px] w-auto image-pixelated drop-shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
      />

      <h1 className="text-[72px] font-black leading-none text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.3)]">
        404
      </h1>

      <p className="mt-3 text-[18px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]">
        Page introuvable
      </p>

      <p className="mt-2 max-w-[400px] text-[14px] leading-relaxed text-[#BEBECE]/70">
        Cette page n&apos;existe pas ou a ete deplacee. Retourne sur la page d&apos;accueil pour continuer ta visite.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-[44px] items-center rounded-[4px] bg-[#2596FF] px-6 text-[13px] font-bold uppercase tracking-[0.04em] text-white transition hover:bg-[#2976E8]"
        >
          Retour a l&apos;accueil
        </Link>
        <Link
          href="/forum"
          className="inline-flex h-[44px] items-center rounded-[4px] bg-[rgba(255,255,255,0.08)] px-6 text-[13px] font-bold uppercase tracking-[0.04em] text-[#DDD] transition hover:bg-[rgba(255,255,255,0.14)]"
        >
          Forum
        </Link>
        <Link
          href="/news"
          className="inline-flex h-[44px] items-center rounded-[4px] bg-[rgba(255,255,255,0.08)] px-6 text-[13px] font-bold uppercase tracking-[0.04em] text-[#DDD] transition hover:bg-[rgba(255,255,255,0.14)]"
        >
          Articles
        </Link>
      </div>
    </main>
  );
}
