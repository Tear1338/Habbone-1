"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import RichEditor from "@/components/editor/RichEditor";
import { Button } from "@/components/ui/button";
import { stripHtml } from "@/lib/text-utils";

export default function ForumCommentForm({ topicId }: { topicId: number }) {
  const router = useRouter();
  const [editorKey, setEditorKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onToggle = () => setOpen((v) => !v)
    const onOpen = () => setOpen(true)
    window.addEventListener('toggle-comment-form', onToggle as any)
    window.addEventListener('open-comment-form', onOpen as any)
    // open if hash is #post-comment
    if (typeof window !== 'undefined' && window.location.hash === '#post-comment') setOpen(true)
    return () => {
      window.removeEventListener('toggle-comment-form', onToggle as any)
      window.removeEventListener('open-comment-form', onOpen as any)
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const html = String(formData.get("comentario") || "");
    const plain = stripHtml(html, { replaceNbsp: true });
    if (!plain) {
      toast.error("Commentaire vide");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forum/topic/${topicId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Echec de publication");
        return;
      }
      toast.success("Commentaire publié");
      setEditorKey((k) => k + 1);
      router.refresh();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      id="post-comment"
      className={`space-y-4 rounded-md border border-[color:var(--bg-600)]/55 bg-[color:var(--bg-800)]/45 p-5 transition-all ${open ? 'opacity-100 scale-100' : 'opacity-0 -translate-y-1 pointer-events-none h-0 overflow-hidden'}`}
    >
      <div className="text-sm font-semibold text-[color:var(--foreground)]/85">Ajouter un commentaire</div>
      <div className="rounded-md border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/50 p-2">
        <RichEditor key={editorKey} name="comentario" variant="simple" placeholder="Partage ton avis sur ce sujet..." />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="inline-flex h-10 items-center justify-center rounded-sm bg-[#1d4bff] px-5 text-sm font-semibold text-white transition hover:bg-[#335bff] disabled:cursor-not-allowed disabled:opacity-75">
          {submitting ? "Publication..." : "Publier"}
        </Button>
      </div>
    </form>
  );
}
