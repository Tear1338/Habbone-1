/**
 * Centralized cache tag constants for on-demand revalidation.
 * Used with `unstable_cache({ tags })` and `revalidateTag()`.
 */

export const TAG_HOME = 'home';
export const TAG_NEWS = 'news';
export const TAG_NEWS_DETAIL = (id: number | string) => `news-${id}`;
export const TAG_FORUM = 'forum';
export const TAG_FORUM_TOPIC = (id: number | string) => `forum-topic-${id}`;
export const TAG_STORIES = 'stories';
export const TAG_SHOP = 'shop';
export const TAG_THEME = 'theme';
export const TAG_PUB = 'pub';
