"use client"
import React, { useState } from "react"
import { toast } from "sonner"
import { buildHabboAvatarUrl } from "@/lib/habbo-imaging"

type CommentBubbleProps = {
  id?: number
  author: string
  date?: string | null
  html: string
  likes?: number
  avatarNick?: string
  canInteract?: boolean
  showActions?: boolean
}

function habboHeadUrl(nick?: string) {
  const safe = String(nick || "").trim()
  return buildHabboAvatarUrl(safe, {
    direction: 2,
    head_direction: 3,
    img_format: "png",
    gesture: "sml",
    headonly: 1,
    size: "m",
  })
}

export default function CommentBubble({
  id,
  author,
  date,
  html,
  likes = 0,
  avatarNick,
  canInteract = false,
  showActions = true,
}: CommentBubbleProps) {
  const imgSrc = habboHeadUrl(avatarNick || author)
  const [likeCount, setLikeCount] = useState(likes)
  const [liking, setLiking] = useState(false)

  const onLike = async () => {
    if (!canInteract || !id || liking) return
    setLiking(true)
    try {
      const res = await fetch(`/api/forum/comments/${id}/like`, { method: 'POST' })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || 'LIKE_FAILED')
      setLikeCount((c) => (json?.liked ? c + 1 : Math.max(0, c - 1)))
    } catch (e: any) {
      toast.error(e?.message || 'Action impossible')
    } finally {
      setLiking(false)
    }
  }

  const onReport = async () => {
    if (!canInteract || !id) return
    try {
      const res = await fetch(`/api/forum/comments/${id}/report`, { method: 'POST' })
      if (!res.ok) throw new Error('REPORT_FAILED')
      toast.success('Merci pour le signalement')
    } catch (e: any) {
      toast.error(e?.message || 'Signalement impossible')
    }
  }

  return (
    <div className="grid grid-cols-[56px_1fr] items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={author ? `Avatar de ${author}` : "Avatar Habbo"}
        className="h-14 w-14 object-contain image-pixelated"
        loading="lazy"
      />

      <div className="relative">
        {/* Encoche derrière la bulle (demi-losange masqué) */}
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rotate-45 bg-[color:var(--bg-900)]/45 border-l border-t border-[color:var(--bg-700)]/60"
        />

        <div className="relative z-10 rounded-md border border-[color:var(--bg-700)]/55 bg-[color:var(--bg-900)]/45 px-5 py-4 shadow-[0_18px_45px_-45px_rgba(0,0,0,0.55)]">
          <div className="prose prose-invert max-w-none leading-relaxed text-[1.05em]" dangerouslySetInnerHTML={{ __html: html || "" }} />

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[color:var(--bg-700)]/40 pt-2 text-xs text-[color:var(--foreground)]/70">
            <span className="truncate">{author || "Anonyme"}</span>
            {date ? (
              <>
                <span className="text-[color:var(--foreground)]/35">•</span>
                <span className="text-[color:var(--foreground)]/55">{date}</span>
              </>
            ) : null}
            {showActions ? (
              <span className="ml-auto inline-flex items-center gap-3">
                <span className="text-[color:var(--foreground)]/65">{likeCount} like{likeCount > 1 ? "s" : ""}</span>
                <button type="button" onClick={onLike} className="text-[#2596FF] hover:underline disabled:opacity-50" aria-label="Aimer ce commentaire" disabled={!canInteract || liking}>{liking ? '...' : 'Aimer'}</button>
                <button type="button" onClick={onReport} className="text-[color:var(--foreground)]/70 hover:underline" aria-label="Signaler ce commentaire" disabled={!canInteract}>Signaler</button>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
