"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ForumCommentForm({ topicId }: { topicId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");

  useEffect(() => {
    const onToggle = () => setOpen((value) => !value);
    const onOpen = () => setOpen(true);
    window.addEventListener("toggle-comment-form", onToggle as any);
    window.addEventListener("open-comment-form", onOpen as any);
    if (typeof window !== "undefined" && window.location.hash === "#post-comment") setOpen(true);
    return () => {
      window.removeEventListener("toggle-comment-form", onToggle as any);
      window.removeEventListener("open-comment-form", onOpen as any);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const plain = content.trim();
    if (!plain) {
      toast.error("Commentaire vide");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forum/topic/${topicId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: plain }),
      });
      const payload = await response.json().catch(() => ({} as any));
      if (!response.ok) {
        toast.error(payload?.error || "Echec de publication");
        return;
      }

      toast.success("Commentaire publie");
      setContent("");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur reseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      id="post-comment"
      onSubmit={handleSubmit}
      className={`rounded-[4px] border border-[#141433] bg-[#272746] p-4 transition-all ${open ? "block" : "hidden"}`}
    >
      <label htmlFor="forum-comment" className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.04em] text-[#DDD]">
        Votre commentaire
      </label>
      <textarea
        id="forum-comment"
        name="commentaire"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={5}
        placeholder="Ecrire votre reponse..."
        className="w-full resize-y rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 py-2 text-[14px] text-white placeholder:text-[#BEBECE] focus:border-[#2596FF] focus:outline-none"
      />
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-[38px] items-center justify-center rounded-[4px] bg-[#2596FF] px-4 text-[12px] font-bold uppercase tracking-[0.04em] text-white hover:bg-[#2976E8] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Publication..." : "Publier"}
        </button>
      </div>
    </form>
  );
}
