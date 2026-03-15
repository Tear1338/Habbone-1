'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const RichEditor = dynamic(() => import('@/components/editor/RichEditor'), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-[4px] bg-[#25254D]" />,
})

export default function NouveauArticlePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')   // pour l'aperçu
  const [imageId, setImageId] = useState('')    // UUID pour Directus
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (title.trim().length < 3) {
      setError('Le titre doit faire au moins 3 caractères.')
      return
    }
    if (content.trim().length < 10) {
      setError('Le contenu doit faire au moins 10 caractères.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: title.trim(),
          descricao: description.trim() || undefined,
          noticia: content,
          imagem: imageId || imageUrl.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Erreur lors de la publication.')
        return
      }

      const articleId = data?.id
      router.push(articleId ? `/news/${articleId}` : '/news')
    } catch {
      setError('Erreur réseau, réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[800px] space-y-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <header className="flex h-[76px] items-center rounded-[4px] border border-black/60 bg-[#1F1F3E] px-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/public.png" alt="" className="h-[38px] w-auto image-pixelated" />
          <h1 className="text-[18px] font-bold uppercase text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Publier un article
          </h1>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]">
            Titre de l&apos;article
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entrez le titre..."
            maxLength={200}
            className="mt-2 h-[45px] w-full rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[14px] text-[#DDD] placeholder:text-[#BEBECE]/50 focus-visible:border-[#2596FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/25"
          />
        </div>

        {/* Description */}
        <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]">
            Résumé (optionnel)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bref résumé de l'article..."
            maxLength={500}
            className="mt-2 h-[45px] w-full rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[14px] text-[#DDD] placeholder:text-[#BEBECE]/50 focus-visible:border-[#2596FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/25"
          />
        </div>

        {/* Image */}
        <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]">
            Image de couverture (optionnel)
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setImageId('') }}
              placeholder="URL ou UUID de l'image..."
              className="h-[45px] flex-1 rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[14px] text-[#DDD] placeholder:text-[#BEBECE]/50 focus-visible:border-[#2596FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/25"
            />
            <label className="inline-flex h-[45px] shrink-0 cursor-pointer items-center gap-2 rounded-[4px] border border-[#34345A] bg-[#1F1F3E] px-4 text-[12px] font-bold uppercase tracking-[0.04em] text-[#BEBECE] transition hover:bg-[#25254D] hover:text-[#DDD]">
              <span className="material-icons text-[16px]">upload</span>
              {uploading ? 'Upload...' : 'Uploader'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  e.target.value = ''
                  setUploading(true)
                  try {
                    const formData = new FormData()
                    formData.set('file', file)
                    const res = await fetch('/api/upload/image', { method: 'POST', body: formData })
                    const data = await res.json()
                    if (data?.url && data?.id) {
                      setImageUrl(data.url)   // pour l'aperçu
                      setImageId(data.id)     // UUID pour Directus
                    } else {
                      setError(data?.error || "Erreur lors de l'upload.")
                    }
                  } catch {
                    setError("Erreur réseau lors de l'upload.")
                  } finally {
                    setUploading(false)
                  }
                }}
              />
            </label>
          </div>
          {imageUrl && (
            <div className="mt-3 overflow-hidden rounded-[4px] border border-[#141433] bg-[#1F1F3E]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Aperçu" className="max-h-[150px] w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]">
            Contenu de l&apos;article
          </label>
          <div className="mt-2">
            <RichEditor
              name="noticia"
              initialHTML=""
              onChange={setContent}
              variant="full"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-[4px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/news"
            className="inline-flex h-[45px] items-center rounded-[4px] border border-[#34345A] bg-[#1F1F3E] px-6 text-[12px] font-bold uppercase tracking-[0.04em] text-[#BEBECE] transition hover:bg-[#25254D] hover:text-[#DDD]"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-[45px] items-center rounded-[4px] bg-[#2596FF] px-6 text-[12px] font-bold uppercase tracking-[0.04em] text-white transition hover:bg-[#2976E8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Publication...' : 'Publier l\'article'}
          </button>
        </div>
      </form>
    </main>
  )
}
