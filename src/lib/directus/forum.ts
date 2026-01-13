import { readItem, readItems } from '@directus/sdk';

import { directus } from './client';
import type { ForumCategoryRecord, ForumCommentRecord, ForumPostRecord, ForumTopicRecord } from './types';

type LikeRow = { id_comentario: number | string };

export function getTopics(): Promise<ForumTopicRecord[]> {
  return directus.request(
    readItems('forum_topicos', {
      fields: ['id', 'titulo', 'conteudo', 'imagem', 'autor', 'data', 'views', 'fixo', 'fechado', 'status'],
      sort: ['-data'],
      limit: 50,
    })
  ) as Promise<ForumTopicRecord[]>;
}

export function listAllTopics(limit = 1000): Promise<ForumTopicRecord[]> {
  return directus.request(
    readItems('forum_topicos', {
      fields: ['id', 'titulo', 'conteudo', 'imagem', 'autor', 'data', 'views', 'fixo', 'fechado', 'status'],
      sort: ['-data'],
      limit,
    })
  ) as Promise<ForumTopicRecord[]>;
}

export function getOneTopic(id: number): Promise<ForumTopicRecord> {
  return directus.request(
    readItem('forum_topicos', id, {
      fields: ['id', 'titulo', 'conteudo', 'imagem', 'autor', 'data', 'views', 'fixo', 'fechado', 'status'],
    })
  ) as Promise<ForumTopicRecord>;
}

export function getOnePost(id: number): Promise<ForumPostRecord> {
  return directus.request(
    readItem('forum_posts', id, {
      fields: ['id', 'id_topico', 'conteudo', 'autor', 'data', 'status'],
    })
  ) as Promise<ForumPostRecord>;
}

export function listAllPosts(limit = 1000): Promise<ForumPostRecord[]> {
  return directus.request(
    readItems('forum_posts', {
      fields: ['id', 'id_topico', 'conteudo', 'autor', 'data', 'status'],
      sort: ['-data'],
      limit,
    })
  ) as Promise<ForumPostRecord[]>;
}

export function listForumCategories(): Promise<ForumCategoryRecord[]> {
  return directus.request(
    readItems('forum_cat', {
      fields: ['id', 'nome', 'descricao', 'slug', 'ordem'],
      sort: ['ordem', 'nome'],
      limit: 50,
    })
  ) as Promise<ForumCategoryRecord[]>;
}

export function getTopicComments(topicId: number): Promise<ForumCommentRecord[]> {
  return directus.request(
    readItems('forum_coment', {
      filter: { id_forum: { _eq: topicId } },
      fields: ['id', 'id_forum', 'comentario', 'autor', 'data', 'status'],
      sort: ['data'],
      limit: 500,
    })
  ) as Promise<ForumCommentRecord[]>;
}

export async function getLikesMapForTopicComments(commentIds: number[]): Promise<Record<number, number>> {
  if (!commentIds?.length) return {};
  const likes = (await directus.request(
    readItems('forum_coment_curtidas', {
      filter: { id_comentario: { _in: commentIds } },
      fields: ['id_comentario'],
      limit: 5000,
    })
  )) as LikeRow[];
  return (likes as LikeRow[]).reduce((acc: Record<number, number>, row: LikeRow) => {
    const cid = Number((row as LikeRow).id_comentario);
    acc[cid] = (acc[cid] ?? 0) + 1;
    return acc;
  }, {});
}

export type {
  ForumTopicRecord,
  ForumPostRecord,
  ForumCommentRecord,
  ForumCategoryRecord,
} from './types';
