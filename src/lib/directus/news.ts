import { readItem, readItems } from '@directus/sdk';

import { directus } from './client';
import type { NewsCommentRecord, NewsRecord } from './types';

type LikeRow = { id_comentario: number | string };

export function getNews(query?: string): Promise<NewsRecord[]> {
  const q = typeof query === 'string' ? query.trim() : '';
  return directus.request(
    readItems('noticias', {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'noticia', 'status', 'autor', 'data'],
      sort: ['-data'],
      limit: 24,
      ...(q ? { search: q } : {}),
    })
  ) as Promise<NewsRecord[]>;
}

export function listAllNews(limit = 1000): Promise<NewsRecord[]> {
  return directus.request(
    readItems('noticias', {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'noticia', 'status', 'autor', 'data'],
      sort: ['-data'],
      limit,
    })
  ) as Promise<NewsRecord[]>;
}

export function listNewsByAuthor(author: string, limit = 50): Promise<NewsRecord[]> {
  return directus.request(
    readItems('noticias', {
      filter: { autor: { _eq: author } },
      fields: ['id', 'titulo', 'descricao', 'imagem', 'autor', 'data', 'status'],
      sort: ['-data'],
      limit,
    })
  ) as Promise<NewsRecord[]>;
}

export function getOneNews(id: number): Promise<NewsRecord> {
  return directus.request(
    readItem('noticias', id, {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'noticia', 'autor', 'data', 'status'],
    })
  ) as Promise<NewsRecord>;
}

export function listNewsForCards(limit = 60): Promise<NewsRecord[]> {
  return directus.request(
    readItems('noticias', {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'data'],
      sort: ['-data'],
      limit,
    })
  ) as Promise<NewsRecord[]>;
}

export function getNewsComments(newsId: number): Promise<NewsCommentRecord[]> {
  return directus.request(
    readItems('noticias_coment', {
      filter: { id_noticia: { _eq: newsId } },
      fields: ['id', 'id_noticia', 'comentario', 'autor', 'data', 'status'],
      sort: ['data'],
      limit: 200,
    })
  ) as Promise<NewsCommentRecord[]>;
}

export async function getLikesMapForNewsComments(commentIds: number[]): Promise<Record<number, number>> {
  if (!commentIds?.length) return {};
  const likes = (await directus.request(
    readItems('noticias_coment_curtidas', {
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

export type { NewsRecord, NewsCommentRecord } from './types';
