import Image from 'next/image';
import Link from 'next/link';
import { Newspaper, Search } from 'lucide-react';
import { mediaUrl } from '@/lib/directus/media';
import { getNews } from '@/lib/directus/news';
import { stripHtml } from '@/lib/text-utils';
import { formatDateTimeFromString } from '@/lib/date-utils';

export const revalidate = 60;

const NEWS_FALLBACK_ICON = '/img/news.png';

function buildExcerpt(record: any) {
  const source = record?.descricao || record?.noticia || '';
  const plain = stripHtml(source);
  if (!plain) return '';
  if (plain.length <= 160) return plain;
  return `${plain.slice(0, 160).trimEnd()}...`;
}

type NewsPageProps = {
  searchParams?: Promise<{ q?: string }>
};

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = (await searchParams) ?? {};
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  const rawNews = await getNews(query).catch(() => []);
  const news: any[] = Array.isArray(rawNews)
    ? rawNews
    : Array.isArray((rawNews as any)?.data)
      ? (rawNews as any).data
      : Array.isArray((rawNews as any)?.items)
        ? (rawNews as any).items
        : [];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-md border border-[color:var(--bg-700)]/65 bg-[color:var(--bg-800)]/45 px-6 py-5 shadow-[0_30px_70px_-60px_rgba(0,0,0,0.8)] md:flex md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-[color:var(--bg-700)]/70">
            <Newspaper className="h-6 w-6 text-[color:var(--foreground)]/80" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--foreground)]/55">Explorer</p>
            <h1 className="text-lg font-bold uppercase tracking-[0.32em] text-[color:var(--foreground)]">
              Tous les articles
            </h1>
          </div>
        </div>
        <form className="mt-4 md:mt-0 md:w-80" method="get">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[color:var(--foreground)]/35" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Rechercher un article"
              className="h-11 w-full rounded-sm border border-[color:var(--bg-600)]/60 bg-[color:var(--bg-900)]/55 pl-9 pr-3 text-sm font-medium text-[color:var(--foreground)]/85 placeholder:text-[color:var(--foreground)]/30 focus-visible:border-[color:var(--bg-300)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--bg-300)]/25"
            />
          </div>
        </form>
      </section>

      <section className="space-y-4">
        {news.length === 0 ? (
          <div className="rounded-md border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/40 px-6 py-16 text-center text-sm uppercase tracking-[0.24em] text-[color:var(--foreground)]/45">
            Aucun article trouve
          </div>
        ) : (
          news.map((article: any) => {
            const imageUrl = mediaUrl(article?.imagem);
            const cardImage = imageUrl || NEWS_FALLBACK_ICON;
            const title = stripHtml(article?.titulo || `Article #${article.id}`) || `Article #${article.id}`;
            const excerpt = buildExcerpt(article);
            const bodyPreview = excerpt ? excerpt.slice(0, 140) : '';
            const previewText = bodyPreview
              ? bodyPreview + (excerpt.length > bodyPreview.length ? '.' : '')
              : '';
            const authorLabel = stripHtml(article?.autor || '');
            const statusLabel = stripHtml(article?.status || '');
            const publishedAt = formatDateTimeFromString(article?.data);

            return (
              <article
                key={article.id}
                className="rounded-[2px] border border-[color:var(--bg-700)]/45 bg-[color:var(--bg-900)]/50 px-4 py-5 shadow-[0_18px_55px_-58px_rgba(0,0,0,0.82)] sm:flex sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5 sm:max-w-[70%]">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden border border-[color:var(--bg-700)]/45 bg-[color:var(--bg-800)]/55 p-2">
                    <Image
                      src={cardImage}
                      alt={title}
                      fill
                      sizes="64px"
                      className={imageUrl ? "object-cover" : "object-contain"}
                      priority={false}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Link
                      href={`/news/${article.id}`}
                      className="block text-sm font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground)] hover:text-[color:var(--foreground)]/80"
                    >
                      {title}
                    </Link>
                    {previewText ? (
                      <p className="text-sm leading-relaxed text-[color:var(--foreground)]/65">{previewText}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.07em] text-[color:var(--foreground)]/55">
                      {authorLabel ? <span>Par {authorLabel}</span> : null}
                      {authorLabel && publishedAt ? (
                        <span className="mx-1 h-px w-3 bg-[color:var(--foreground)]/20" />
                      ) : null}
                      {publishedAt ? <span>Publie le {publishedAt}</span> : null}
                      {statusLabel ? (
                        <span className="rounded-[2px] bg-[color:var(--bg-700)]/65 px-2 py-0.5 text-[color:var(--foreground)]/70">
                          {statusLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex w-full justify-end gap-3 text-[0.7rem] font-semibold uppercase text-[color:var(--foreground)]/70 sm:mt-0 sm:w-auto sm:self-center">
                  <Link
                    href={`/news/${article.id}`}
                    className="mr-10 rounded-[2px] bg-[#4c7dff] px-[1.35rem] py-[0.45rem] text-white transition hover:bg-[#6a95ff]"
                  >
                    Voir plus
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
