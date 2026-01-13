export type Dateish = string | number | null | undefined;

export type NewsRecord = {
  id: number;
  titulo?: string | null;
  descricao?: string | null;
  imagem?: string | null;
  noticia?: string | null;
  status?: string | null;
  autor?: string | null;
  data?: Dateish;
};

export type NewsCommentRecord = {
  id: number;
  id_noticia: number;
  comentario?: string | null;
  autor?: string | null;
  data?: Dateish;
  status?: string | null;
};

export type ForumTopicRecord = {
  id: number;
  titulo?: string | null;
  conteudo?: string | null;
  imagem?: string | null;
  autor?: string | null;
  data?: Dateish;
  views?: number | string | null;
  fixo?: boolean | number | string | null;
  fechado?: boolean | number | string | null;
  status?: string | null;
};

export type ForumPostRecord = {
  id: number;
  id_topico: number;
  conteudo?: string | null;
  autor?: string | null;
  data?: Dateish;
  status?: string | null;
};

export type ForumCategoryRecord = {
  id: number | string;
  nome?: string | null;
  descricao?: string | null;
  slug?: string | null;
  ordem?: number | null;
};

export type ForumCommentRecord = {
  id: number;
  id_forum: number;
  comentario?: string | null;
  autor?: string | null;
  data?: Dateish;
  status?: string | null;
};

export type StoryRow = {
  id: number;
  autor?: string | null;
  image?: string | null;
  dta?: Dateish;
  data?: Dateish;
  status?: string | null;
};
