'use client'

import { useEffect, useMemo, useState } from 'react'

type Mobi = {
  id: number
  name: string
  image: string
  category: string
}

// Habbowidget Furni API (public)
const FURNI_API = 'https://www.habboassets.com/api/v1/furnidata?limit=500'

const GRID_COLS = 8
const GRID_ROWS = 5
const PAGE_SIZE = GRID_COLS * GRID_ROWS

export default function MobisPageClient() {
  const [items, setItems] = useState<Mobi[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(FURNI_API)
      .then((r) => r.json())
      .then((json) => {
        // The API may return different formats — handle both
        const raw = Array.isArray(json?.furnidata)
          ? json.furnidata
          : Array.isArray(json?.roomitemtypes?.furnitype)
            ? json.roomitemtypes.furnitype
            : Array.isArray(json)
              ? json
              : []

        const data = raw
          .filter((row: any) => row?.name || row?.classname)
          .map((row: any, idx: number) => ({
            id: Number(row?.id ?? idx),
            name: String(row?.name || row?.classname || 'Mobi'),
            image: row?.icon_url
              || row?.iconUrl
              || row?.image
              || `https://images.habbo.com/dcr/hof_furni/${row?.revision || 0}/${row?.classname || 'unknown'}_icon.png`,
            category: String(row?.category || row?.furniline || 'Autre'),
          }))

        setItems(data)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const term = search.trim().toLowerCase()
    return items.filter(
      (m) => m.name.toLowerCase().includes(term) || m.category.toLowerCase().includes(term)
    )
  }, [items, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)

  const visibleItems = useMemo(() => {
    const start = clampedPage * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, clampedPage])

  const visibleSlots = useMemo(() => {
    if (visibleItems.length >= PAGE_SIZE) return visibleItems
    return [
      ...visibleItems,
      ...Array.from({ length: PAGE_SIZE - visibleItems.length }, () => null as Mobi | null),
    ]
  }, [visibleItems])

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <header className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/store.png" alt="" className="h-[40px] w-auto image-pixelated" />
          <div className="space-y-1">
            <h1 className="text-[20px] font-bold uppercase tracking-[0.08em] text-[#DDD]">
              Mobis Habbo
            </h1>
            <p className="text-[14px] text-[#BEBECE]">
              Tous les mobiliers globaux publiés sur Habbo.
            </p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="relative w-full sm:w-[320px]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#BEBECE] material-icons text-[16px]">
          search
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          placeholder="Rechercher un mobi..."
          className="h-[40px] w-full rounded-[4px] border border-[#141433] bg-[#25254D] pl-9 pr-3 text-[12px] font-normal text-[#DDD] placeholder:text-[#BEBECE]/60 focus-visible:border-[#2596FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/25"
        />
      </div>

      {/* Mobis Grid */}
      <section className="overflow-hidden rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
        <header className="flex h-[50px] items-center justify-between border-b border-[#34345A] bg-[rgba(0,0,0,0.1)] px-5">
          <h2 className="text-[16px] font-bold uppercase text-white">
            Catalogue ({filtered.length} mobis)
          </h2>

          <div className="flex items-center gap-[5px]">
            <button
              type="button"
              aria-label="Page precedente"
              onClick={() => setPage((c) => Math.max(0, c - 1))}
              disabled={clampedPage === 0}
              className="grid h-[40px] w-[40px] place-items-center rounded-[3px] bg-[#2596FF] text-white transition hover:bg-[#2976E8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="material-icons text-[18px]" aria-hidden>chevron_left</i>
            </button>
            <span className="px-2 text-[12px] text-[#BEBECE]">
              {clampedPage + 1} / {pageCount}
            </span>
            <button
              type="button"
              aria-label="Page suivante"
              onClick={() => setPage((c) => Math.min(pageCount - 1, c + 1))}
              disabled={clampedPage >= pageCount - 1}
              className="grid h-[40px] w-[40px] place-items-center rounded-[3px] bg-[rgba(255,255,255,0.1)] text-[#DDD] transition hover:bg-[rgba(255,255,255,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="material-icons text-[18px]" aria-hidden>chevron_right</i>
            </button>
          </div>
        </header>

        <div className="px-[18px] py-[20px]">
          {loading ? (
            <div className="rounded-[4px] border border-dashed border-[#1F1F3E] px-4 py-16 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70">
              Chargement des mobis...
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-[4px] border border-dashed border-[#1F1F3E] px-4 py-16 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70">
              Aucun mobi trouvé.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-[10px] sm:grid-cols-6 lg:grid-cols-8">
              {visibleSlots.map((mobi, index) => (
                <div
                  key={mobi ? `${mobi.id}-${mobi.name}` : `empty-${index}`}
                  title={mobi ? `${mobi.name} (${mobi.category})` : ''}
                  className={`flex aspect-square w-full min-h-[64px] flex-col items-center justify-center rounded-[4px] border border-black/20 bg-[#1F1F3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ${
                    mobi ? 'group transition hover:bg-[#303060]' : 'opacity-35'
                  }`}
                >
                  {mobi ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mobi.image}
                        alt={mobi.name}
                        className="h-[34px] w-[34px] image-pixelated object-contain opacity-80 transition group-hover:scale-110 group-hover:opacity-100"
                        onError={(event) => {
                          (event.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
