import {
    getOnePost,                // 👈 post (pas topic)
    getTopicComments,          // commentaires rattachés au topic
    getLikesMapForTopicComments,
  } from '@/lib/directus';
  
  export const revalidate = 30;
  
  // gère timestamps (secondes, millisecondes) et chaînes ISO
  function fmtDateSmart(v?: string | number | null) {
    if (v == null) return '';
    if (typeof v === 'number') {
      const ms = v < 1e12 ? v * 1000 : v;
      const d = new Date(ms);
      return isNaN(+d) ? '' : d.toLocaleString();
    }
    const n = Number(v);
    if (Number.isFinite(n)) {
      const ms = n < 1e12 ? n * 1000 : n;
      const d = new Date(ms);
      return isNaN(+d) ? '' : d.toLocaleString();
    }
    const d = new Date(v);
    return isNaN(+d) ? '' : d.toLocaleString();
  }
  
  export default async function PostPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    const postId = Number(id);
  
    // 1) Récupère le post
    const post = await getOnePost(postId);        // 👈 correction ici
  
    // 2) Charge les commentaires du TOPIC de ce post
    const topicId = Number(post.id_topico);       // forum_posts.id_topico
    const comments = await getTopicComments(topicId);
  
    // 3) Compteur de likes par commentaire (batch)
    const likesMap = await getLikesMapForTopicComments(
      comments.map((c: any) => Number(c.id))
    );
  
    return (
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <article className="border rounded p-4">
          <h1 className="text-xl font-bold">Post #{post.id}</h1>
          <div className="text-xs opacity-60">{fmtDateSmart(post.data)}</div>
          <div
            className="mt-3 prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.conteudo || "" }}
          />
        </article>
  
        <section>
          <h2 className="text-lg font-semibold mb-2">
            Commentaires du topic ({comments.length})
          </h2>
          <ul className="space-y-3">
            {comments.map((c: any) => (
              <li key={c.id} className="border rounded p-3">
                <div className="text-xs opacity-60 mb-1">
                  {fmtDateSmart(c.data)} • 👍 {likesMap[Number(c.id)] ?? 0}
                </div>
                <div
                  className="prose prose-sm prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: c.comentario }}
                />
              </li>
            ))}
          </ul>
        </section>
      </main>
    );
  }
  
