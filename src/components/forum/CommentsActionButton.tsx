"use client";

type CommentsActionButtonProps = {
  isAuthenticated: boolean
  className?: string
  label?: string
}

export default function CommentsActionButton({
  isAuthenticated,
  className,
  label = "Ecrire commentaire",
}: CommentsActionButtonProps) {
  const onClick = () => {
    if (isAuthenticated) {
      window.dispatchEvent(new Event('open-comment-form'))
      const el = document.getElementById('post-comment')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      // no-op: page provides a login link in actions when not auth
    }
  }
  if (!isAuthenticated) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className={className || "inline-flex h-[38px] items-center justify-center rounded-[4px] bg-[#2596FF] px-4 text-[12px] font-bold uppercase tracking-[0.04em] text-white hover:bg-[#2976E8]"}
    >
      {label}
    </button>
  )
}
