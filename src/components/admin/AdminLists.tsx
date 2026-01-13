"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RichEditor from "@/components/editor/RichEditor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDateTimeFromString } from "@/lib/date-utils";

type Fn = (formData: FormData) => Promise<void>;

type VisibleSection =
  | "topics"
  | "posts"
  | "articles"
  | "forumComments"
  | "newsComments";

const ALL_SECTIONS: VisibleSection[] = ["topics", "posts", "articles", "forumComments", "newsComments"];

export default function AdminLists(props: {
  topics: any[];
  posts: any[];
  news: any[];
  topicTitleById?: Record<number, string>;
  updateTopic: Fn;
  deleteTopic: Fn;
  updatePost: Fn;
  deletePost: Fn;
  updateArticle: Fn;
  deleteArticle: Fn;
  forumComments?: any[];
  newsComments?: any[];
  updateForumComment?: Fn;
  deleteForumComment?: Fn;
  updateNewsComment?: Fn;
  deleteNewsComment?: Fn;
  visibleSections?: VisibleSection[];
}) {
  const {
    topics,
    posts,
    news,
    forumComments = [],
    newsComments = [],
    visibleSections = ALL_SECTIONS,
  } = props;

  const [openTopic, setOpenTopic] = useState<number | null>(null);
  const [openPost, setOpenPost] = useState<number | null>(null);
  const [openArticle, setOpenArticle] = useState<number | null>(null);
  const [openForumComment, setOpenForumComment] = useState<number | null>(null);
  const [openNewsComment, setOpenNewsComment] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const qnorm = q.trim().toLowerCase();

  const topicsView = useMemo(
    () =>
      !qnorm
        ? topics
        : topics.filter((t: any) =>
            `${t?.titulo ?? ""} ${t?.autor ?? ""} ${t?.id ?? ""}`.toLowerCase().includes(qnorm),
          ),
    [topics, qnorm],
  );

  const postsView = useMemo(
    () =>
      !qnorm
        ? posts
        : posts.filter((p: any) =>
            `${p?.autor ?? ""} ${p?.id ?? ""} ${props.topicTitleById?.[Number(p?.id_topico)] ?? ""}`
              .toLowerCase()
              .includes(qnorm),
          ),
    [posts, qnorm, props.topicTitleById],
  );

  const newsView = useMemo(
    () =>
      !qnorm
        ? news
        : news.filter((n: any) =>
            `${n?.titulo ?? ""} ${n?.autor ?? ""} ${n?.id ?? ""}`.toLowerCase().includes(qnorm),
          ),
    [news, qnorm],
  );

  const forumCommentsView = useMemo(
    () =>
      !qnorm
        ? forumComments
        : forumComments.filter((c: any) =>
            `${c?.autor ?? ""} ${c?.id ?? ""} ${c?.id_forum ?? ""}`.toLowerCase().includes(qnorm),
          ),
    [forumComments, qnorm],
  );

  const newsCommentsView = useMemo(
    () =>
      !qnorm
        ? newsComments
        : newsComments.filter((c: any) =>
            `${c?.autor ?? ""} ${c?.id ?? ""} ${c?.id_noticia ?? ""}`.toLowerCase().includes(qnorm),
          ),
    [newsComments, qnorm],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const ok = u.searchParams.get("ok");
    if (!ok) return;
    const label: Record<string, string> = {
      "topic-updated": "Sujet mis à jour",
      "topic-deleted": "Sujet supprimé",
      "post-updated": "Message mis à jour",
      "post-deleted": "Message supprimé",
      "article-updated": "Article mis à jour",
      "article-deleted": "Article supprimé",
      "forum-comment-updated": "Commentaire forum mis à jour",
      "forum-comment-deleted": "Commentaire forum supprimé",
      "news-comment-updated": "Commentaire article mis à jour",
      "news-comment-deleted": "Commentaire article supprimé",
    };
    toast.success(label[ok] || "Action effectuée");
    u.searchParams.delete("ok");
    window.history.replaceState({}, "", u.toString());
  }, []);

  const showTopics = visibleSections.includes("topics");
  const showPosts = visibleSections.includes("posts");
  const showArticles = visibleSections.includes("articles");
  const showForumComments = visibleSections.includes("forumComments");
  const showNewsComments = visibleSections.includes("newsComments");

  const totalVisible =
    (showTopics ? topicsView.length : 0) +
    (showPosts ? postsView.length : 0) +
    (showArticles ? newsView.length : 0) +
    (showForumComments ? forumCommentsView.length : 0) +
    (showNewsComments ? newsCommentsView.length : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-12">
        <Input
          placeholder="Rechercher (titre, auteur, id)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
          aria-label="Rechercher dans la liste"
        />
        <span className="text-sm opacity-70">
          {totalVisible} résultat{totalVisible > 1 ? "s" : ""}
        </span>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {showTopics && (
          <AccordionItem
            value="topics"
            className="rounded-lg border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-600)] shadow-[0_18px_50px_-35px_rgba(0,0,0,0.6)]"
          >
            <AccordionTrigger className="px-5 py-3 hover:bg-[color:var(--bg-700)]/40">
              <span className="text-base font-semibold">Forum – Sujets ({topicsView.length})</span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <SectionList
                emptyLabel="Aucun sujet trouvé."
                items={topicsView}
                getKey={(t: any) => t.id}
                render={(t: any) => (
                  <Card className="border-[color:var(--bg-800)] bg-[color:var(--bg-700)]">
                    <CardHeader className="pb-3 pt-3">
                      <CardTitle className="text-base font-semibold">{t.titulo || "(sans titre)"}</CardTitle>
                      <div className="flex items-center gap-2">
                        <CardDescription className="text-xs">
                          Sujet #{t.id} · {t.autor || "-"} · {formatDateTimeFromString(t.data)} · vues : {t.views ?? 0}
                        </CardDescription>
                        {t?.status ? <Badge variant="secondary">{String(t.status)}</Badge> : null}
                      </div>
                    </CardHeader>
                    <CardFooter className="gap-2 pt-3">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setOpenTopic(openTopic === t.id ? null : t.id)}
                      >
                        {openTopic === t.id ? "Fermer" : "Mettre à jour"}
                      </Button>
                      <DeleteDialog
                        label={`Supprimer le sujet #${t.id} ?`}
                        onSubmit={props.deleteTopic}
                        id={t.id}
                      />
                    </CardFooter>
                    <AnimatePresence initial={false}>
                      {openTopic === t.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-5">
                            <form action={props.updateTopic} className="flex flex-col gap-4">
                              <input type="hidden" name="id" value={t.id} />
                              <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Titre">
                                  <Input name="titulo" defaultValue={t.titulo || ""} placeholder="Titre du sujet" />
                                </Field>
                                <Field label="Image (UUID Directus)">
                                  <Input name="imagem" defaultValue={t.imagem || ""} placeholder="UUID image" />
                                </Field>
                              </div>
                              <Field label="Contenu">
                                <RichEditor name="conteudo" initialHTML={t.conteudo || ""} variant="full" />
                              </Field>
                              <div className="flex items-center gap-6 text-sm pt-1">
                                <label className="flex items-center gap-2">
                                  <input type="checkbox" name="fixo" defaultChecked={!!t.fixo} /> <span>Épinglé</span>
                                </label>
                                <label className="flex items-center gap-2">
                                  <input type="checkbox" name="fechado" defaultChecked={!!t.fechado} /> <span>Fermé</span>
                                </label>
                              </div>
                              <FormActions onCancel={() => setOpenTopic(null)} />
                            </form>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {showPosts && (
          <AccordionItem
            value="posts"
            className="rounded-lg border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-600)] shadow-[0_18px_50px_-35px_rgba(0,0,0,0.6)]"
          >
            <AccordionTrigger className="px-5 py-3 hover:bg-[color:var(--bg-700)]/40">
              <span className="text-base font-semibold">Forum – Messages ({postsView.length})</span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <SectionList
                emptyLabel="Aucun message trouvé."
                items={postsView}
                getKey={(p: any) => p.id}
                render={(p: any) => (
                  <Card className="border-[color:var(--bg-800)] bg-[color:var(--bg-700)]">
                    <CardHeader className="pb-3 pt-3">
                      <CardTitle className="text-base font-semibold">
                        {props.topicTitleById?.[Number(p.id_topico)] || `Sujet #${p.id_topico}`}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <CardDescription className="text-xs">
                          Message #{p.id} · {p.autor || "-"} · {formatDateTimeFromString(p.data)}
                        </CardDescription>
                        {p?.status ? <Badge variant="secondary">{String(p.status)}</Badge> : null}
                      </div>
                    </CardHeader>
                    {p.conteudo && (
                      <CardContent className="pt-1">
                        <div
                          className="line-clamp-2 text-sm opacity-90"
                          dangerouslySetInnerHTML={{ __html: String(p.conteudo) }}
                        />
                      </CardContent>
                    )}
                    <CardFooter className="gap-2 pt-3">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setOpenPost(openPost === p.id ? null : p.id)}
                      >
                        {openPost === p.id ? "Fermer" : "Mettre à jour"}
                      </Button>
                      <DeleteDialog
                        label={`Supprimer le message #${p.id} ?`}
                        onSubmit={props.deletePost}
                        id={p.id}
                      />
                    </CardFooter>
                    <AnimatePresence initial={false}>
                      {openPost === p.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-5">
                            <form action={props.updatePost} className="flex flex-col gap-4">
                              <input type="hidden" name="id" value={p.id} />
                              <Field label="Contenu">
                                <RichEditor name="conteudo" initialHTML={p.conteudo || ""} variant="full" />
                              </Field>
                              <FormActions onCancel={() => setOpenPost(null)} />
                            </form>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {showArticles && (
          <AccordionItem
            value="news"
            className="rounded-lg border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-600)] shadow-[0_18px_50px_-35px_rgba(0,0,0,0.6)]"
          >
            <AccordionTrigger className="px-5 py-3 hover:bg-[color:var(--bg-700)]/40">
              <span className="text-base font-semibold">Articles ({newsView.length})</span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <SectionList
                emptyLabel="Aucun article trouvé."
                items={newsView}
                getKey={(n: any) => n.id}
                render={(n: any) => (
                  <Card className="border-[color:var(--bg-800)] bg-[color:var(--bg-700)]">
                    <CardHeader className="pb-3 pt-3">
                      <CardTitle className="text-base font-semibold">{n.titulo || "(sans titre)"}</CardTitle>
                      <div className="flex items-center gap-2">
                        <CardDescription className="text-xs">
                          Article #{n.id} · {n.autor || "-"} · {formatDateTimeFromString(n.data)}
                        </CardDescription>
                        {n?.status ? <Badge variant="secondary">{String(n.status)}</Badge> : null}
                      </div>
                    </CardHeader>
                    {n.descricao && (
                      <CardContent className="pt-1">
                        <p className="text-sm opacity-80">{n.descricao}</p>
                      </CardContent>
                    )}
                    <CardFooter className="gap-2 pt-3">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setOpenArticle(openArticle === n.id ? null : n.id)}
                      >
                        {openArticle === n.id ? "Fermer" : "Mettre à jour"}
                      </Button>
                      <DeleteDialog
                        label={`Supprimer l’article #${n.id} ?`}
                        onSubmit={props.deleteArticle}
                        id={n.id}
                      />
                    </CardFooter>
                    <AnimatePresence initial={false}>
                      {openArticle === n.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-5">
                            <form action={props.updateArticle} className="flex flex-col gap-4">
                              <input type="hidden" name="id" value={n.id} />
                              <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Titre">
                                  <Input name="titulo" defaultValue={n.titulo || ""} placeholder="Titre" />
                                </Field>
                                <Field label="Description">
                                  <Input name="descricao" defaultValue={n.descricao || ""} placeholder="Description" />
                                </Field>
                              </div>
                              <Field label="Image (UUID Directus)">
                                <Input name="imagem" defaultValue={n.imagem || ""} placeholder="UUID image" />
                              </Field>
                              <Field label="Contenu">
                                <RichEditor name="noticia" initialHTML={n.noticia || ""} variant="full" />
                              </Field>
                              <FormActions onCancel={() => setOpenArticle(null)} />
                            </form>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {showNewsComments && (
          <AccordionItem
            value="news-comments"
            className="rounded-lg border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-600)] shadow-[0_18px_50px_-35px_rgba(0,0,0,0.6)]"
          >
            <AccordionTrigger className="px-5 py-3 hover:bg-[color:var(--bg-700)]/40">
              <span className="text-base font-semibold">Articles – Commentaires ({newsCommentsView.length})</span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <SectionList
                emptyLabel="Aucun commentaire trouvé."
                items={newsCommentsView}
                getKey={(c: any) => c.id}
                render={(c: any) => (
                  <Card className="border-[color:var(--bg-800)] bg-[color:var(--bg-700)]">
                    <CardHeader className="pb-3 pt-3">
                      <CardTitle className="text-base font-semibold">Commentaire #{c.id}</CardTitle>
                      <CardDescription className="text-xs">
                        Article #{c.id_noticia} · {c.autor || "-"} · {formatDateTimeFromString(c.data)}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="gap-2 pt-3">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setOpenNewsComment(openNewsComment === c.id ? null : c.id)}
                      >
                        {openNewsComment === c.id ? "Fermer" : "Mettre à jour"}
                      </Button>
                      <DeleteDialog
                        label={`Supprimer le commentaire #${c.id} ?`}
                        onSubmit={props.deleteNewsComment}
                        id={c.id}
                      />
                    </CardFooter>
                    <AnimatePresence initial={false}>
                      {openNewsComment === c.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-5">
                            <form action={props.updateNewsComment} className="flex flex-col gap-4">
                              <input type="hidden" name="id" value={c.id} />
                              <Field label="Contenu">
                                <RichEditor name="comentario" initialHTML={c.comentario || ""} variant="simple" />
                              </Field>
                              <FormActions onCancel={() => setOpenNewsComment(null)} />
                            </form>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {showForumComments && (
          <AccordionItem
            value="forum-comments"
            className="rounded-lg border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-600)] shadow-[0_18px_50px_-35px_rgba(0,0,0,0.6)]"
          >
            <AccordionTrigger className="px-5 py-3 hover:bg-[color:var(--bg-700)]/40">
              <span className="text-base font-semibold">Forum – Commentaires ({forumCommentsView.length})</span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <SectionList
                emptyLabel="Aucun commentaire trouvé."
                items={forumCommentsView}
                getKey={(c: any) => c.id}
                render={(c: any) => (
                  <Card className="border-[color:var(--bg-800)] bg-[color:var(--bg-700)]">
                    <CardHeader className="pb-3 pt-3">
                      <CardTitle className="text-base font-semibold">Commentaire #{c.id}</CardTitle>
                      <CardDescription className="text-xs">
                        Sujet #{c.id_forum} · {c.autor || "-"} · {formatDateTimeFromString(c.data)}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="gap-2 pt-3">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setOpenForumComment(openForumComment === c.id ? null : c.id)}
                      >
                        {openForumComment === c.id ? "Fermer" : "Mettre à jour"}
                      </Button>
                      <DeleteDialog
                        label={`Supprimer le commentaire #${c.id} ?`}
                        onSubmit={props.deleteForumComment}
                        id={c.id}
                      />
                    </CardFooter>
                    <AnimatePresence initial={false}>
                      {openForumComment === c.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-5">
                            <form action={props.updateForumComment} className="flex flex-col gap-4">
                              <input type="hidden" name="id" value={c.id} />
                              <Field label="Contenu">
                                <RichEditor name="comentario" initialHTML={c.comentario || ""} variant="simple" />
                              </Field>
                              <FormActions onCancel={() => setOpenForumComment(null)} />
                            </form>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function SectionList<T>({
  items,
  render,
  emptyLabel,
  getKey,
}: {
  items: T[];
  render: (item: T) => JSX.Element;
  emptyLabel: string;
  getKey?: (item: T, index: number) => string | number;
}) {
  if (!items.length) {
    return <p className="py-6 text-center text-sm opacity-70">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-4">
      {items.map((item, index) => (
        <li key={getKey ? getKey(item, index) : index}>{render(item)}</li>
      ))}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium opacity-80">{label}</label>
      {children}
    </div>
  );
}

function FormActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="submit" size="sm">
        Enregistrer
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Annuler
      </Button>
    </div>
  );
}

function DeleteDialog({ label, onSubmit, id }: { label: string; onSubmit?: Fn; id: number }) {
  if (!onSubmit) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer la suppression</DialogTitle>
        </DialogHeader>
        <p className="text-sm opacity-80">{label}</p>
        <DialogFooter>
          <form action={onSubmit} className="w-max">
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="destructive" size="sm">
              Supprimer
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

