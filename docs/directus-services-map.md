# Directus Services Map

This report maps the Directus client/server layers, the collections used, and the current call sites.

## Overview
- Server layer uses the Directus SDK with `DIRECTUS_SERVICE_TOKEN` for privileged access.
- Client layer uses the Directus SDK with public access (no token) for read-only content.
- `USERS_TABLE` and `STORIES_TABLE` are configurable via env and default to `usuarios` and `usuarios_storie`.

## Server Layer (service token)

### src/server/directus/client.ts
- Purpose: shared Directus SDK client and low-level helpers.
- Env: `NEXT_PUBLIC_DIRECTUS_URL`, `DIRECTUS_SERVICE_TOKEN`, `USERS_TABLE`, `STORIES_TABLE`, `DIRECTUS_FILES_FOLDER`.
- Exports: `directusService`, `rItems`, `rItem`, `cItem`, `uItem`, `dItem`, `directusUrl`, `serviceToken`.
- Used by: all server Directus modules.

### src/server/directus/types.ts
- Purpose: shared server-side types for Directus records.
- Exports: role/user/legacy/news/forum/story/team types.
- Used by: server modules and re-exported by `src/server/directus-service.ts`.

### src/server/directus/security.ts
- Purpose: hashing and password checks for legacy users.
- Functions: `hashPassword`, `passwordsMatch`, `isBcrypt`, `md5`.
- Used by: `src/server/directus/users.ts`.

### src/server/directus/users.ts
- Purpose: legacy user access and verification logic.
- Collections: `USERS_TABLE`.
- Functions:
  - `listUsersByNick`, `getUserByNick`
  - `createUser`, `upgradePasswordToBcrypt`
  - `updateUserVerification`, `markUserAsVerified`
  - `tryUpdateHabboSnapshotForUser`
  - `getUserMoedas`
  - Helpers: `normalizeHotelCode`, `asTrue`, `asFalse`
- Used by:
  - `src/auth.ts`
  - `src/app/api/register/route.ts`
  - `src/app/api/verify/status/route.ts`
  - `src/app/api/verify/regenerate/route.ts`
  - `src/app/api/auth/check-user/route.ts`
  - `src/app/api/user/moedas/route.ts`

### src/server/directus/admin-users.ts
- Purpose: admin operations for Directus system users.
- Collections: `directus_users`.
- Functions:
  - `adminListUsers`, `searchUsers`
  - `getDirectusUserById`
  - `setDirectusUserStatus`, `deleteDirectusUser`
- Used by:
  - `src/server/authz.ts`
  - `src/app/api/admin/users/search/route.ts`
  - `src/app/api/admin/users/ban/route.ts`
  - `src/app/api/admin/users/delete/route.ts`
  - `src/app/api/admin/users/set-role/route.ts`

### src/server/directus/roles.ts
- Purpose: Directus role management.
- Collections: `directus_roles`, `directus_users` (role assignment).
- Functions: `listRoles`, `createRole`, `updateRole`, `getRoleById`, `setUserRole`.
- Used by:
  - `src/auth.ts`
  - `src/server/authz.ts`
  - `src/app/api/admin/roles/list/route.ts`
  - `src/app/api/admin/roles/create/route.ts`
  - `src/app/api/admin/roles/update/route.ts`
  - `src/app/api/admin/roles/seed/route.ts`
  - `src/app/api/admin/users/set-role/route.ts`
  - `src/app/api/admin/users/search/route.ts`

### src/server/directus/legacy-users.ts
- Purpose: legacy users admin operations (same physical table as `USERS_TABLE`).
- Collections: `USERS_TABLE`.
- Functions:
  - `getLegacyUserByEmail`, `searchLegacyUsuarios`
  - `setLegacyUserRole`, `setLegacyUserBanStatus`, `deleteLegacyUser`
- Used by:
  - `src/app/api/admin/users/search/route.ts`
  - `src/app/api/admin/users/ban/route.ts`
  - `src/app/api/admin/users/delete/route.ts`
  - `src/app/api/admin/users/set-role/route.ts`

### src/server/directus/news.ts
- Purpose: news admin CRUD and comments (service token).
- Collections: `noticias`, `noticias_coment`.
- Functions:
  - `adminListNews`, `adminCreateNews`, `adminUpdateNews`, `adminDeleteNews`
  - `listNewsByAuthorService`
  - `adminListNewsComments`, `adminUpdateNewsComment`, `adminDeleteNewsComment`
  - `createNewsComment`
- Used by:
  - `src/app/profile/admin/page.tsx`
  - `src/app/api/profile/articles/route.ts`
  - `src/app/api/news/[id]/comments/route.ts`

### src/server/directus/forum.ts
- Purpose: forum admin CRUD, comments, votes, likes, reports.
- Collections: `forum_topicos`, `forum_posts`, `forum_cat`, `forum_coment`,
  `forum_coment_curtidas`, `forum_interacoes`, `forum_topicos_votos`.
- Functions:
  - Admin: `adminListForumTopics`, `adminUpdateForumTopic`, `adminDeleteForumTopic`,
    `adminCreateForumPost`, `adminUpdateForumPost`, `adminDeleteForumPost`,
    `adminListForumComments`, `adminUpdateForumComment`, `adminDeleteForumComment`
  - Public helpers: `createForumComment`, `toggleForumCommentLike`, `reportForumComment`,
    `setTopicVote`, `getTopicVoteSummary`
  - Data listing: `listForumCategoriesService`, `listForumTopicsWithCategories`
- Used by:
  - `src/app/profile/admin/page.tsx`
  - `src/app/forum/page.tsx`
  - `src/app/forum/topic/[id]/page.tsx` (vote summary)
  - `src/app/api/forum/topic/[id]/comments/route.ts`
  - `src/app/api/forum/comments/[id]/like/route.ts`
  - `src/app/api/forum/comments/[id]/report/route.ts`
  - `src/app/api/forum/topics/[id]/vote/route.ts`

### src/server/directus/stories.ts
- Purpose: stories upload + counts + service list.
- Collections: `STORIES_TABLE` (default `usuarios_storie`), `directus_files`.
- Functions:
  - `uploadFileToDirectus`, `createStoryRow`
  - `countStoriesThisMonthByAuthor`
  - `listStoriesService` (uses `resolveStoriesTables`)
- Used by:
  - `src/app/api/stories/route.ts`
  - `src/components/home/stories.tsx` (server component)

### src/server/directus/team.ts
- Purpose: staff listing by role (legacy table).
- Collections: `USERS_TABLE`.
- Functions: `listTeamMembersByRoles`.
- Used by:
  - `src/app/team/page.tsx`

### src/server/directus/admin.ts
- Purpose: admin counts (table totals).
- Collections: any table via REST, plus `USERS_TABLE`.
- Functions: `adminCount`, `adminCountUsers`.
- Used by:
  - `src/app/profile/admin/page.tsx`

### src/server/directus-service.ts (facade)
- Purpose: compatibility re-export layer for server Directus functions/types.
- Used by: currently no direct imports, kept for backward compatibility.

## Client Layer (public)

### src/lib/directus/client.ts
- Purpose: public Directus SDK client (no token).
- Env: `NEXT_PUBLIC_DIRECTUS_URL`.
- Exports: `directus`, `directusUrl`.
- Used by: `src/lib/directus/*.ts` modules.

### src/lib/directus/types.ts
- Purpose: shared client-side types.
- Used by: client domain modules and components.

### src/lib/directus/news.ts
- Purpose: public read of news and comments.
- Collections: `noticias`, `noticias_coment`, `noticias_coment_curtidas`.
- Functions: `getNews`, `getOneNews`, `listAllNews`, `listNewsForCards`, `getNewsComments`,
  `getLikesMapForNewsComments`, `listNewsByAuthor`.
- Used by:
  - `src/app/news/page.tsx`
  - `src/app/news/[id]/page.tsx`
  - `src/components/home/latest-articles.tsx`
  - `src/app/profile/admin/page.tsx`

### src/lib/directus/forum.ts
- Purpose: public read of forum topics/posts/comments.
- Collections: `forum_topicos`, `forum_posts`, `forum_cat`, `forum_coment`, `forum_coment_curtidas`.
- Functions: `getTopics`, `getOneTopic`, `listAllTopics`, `getOnePost`, `listAllPosts`,
  `listForumCategories`, `getTopicComments`, `getLikesMapForTopicComments`.
- Used by:
  - `src/app/forum/post/[id]/page.tsx`
  - `src/app/forum/topic/[id]/page.tsx`
  - `src/app/profile/admin/page.tsx`

### src/lib/directus/stories.ts
- Purpose: public read of stories via tables list.
- Collections: resolved by `resolveStoriesTables()`.
- Functions: `listStories`.
- Used by: no direct imports found (server path used in `Stories` component).

### src/lib/directus/media.ts
- Purpose: media URL resolver.
- Env: `NEXT_PUBLIC_LEGACY_MEDIA_BASE` (optional).
- Functions: `mediaUrl`.
- Used by:
  - `src/app/news/page.tsx`
  - `src/app/news/[id]/page.tsx`
  - `src/app/forum/page.tsx`
  - `src/app/forum/topic/[id]/page.tsx`
  - `src/components/home/latest-articles-client.tsx`
  - `src/components/home/stories.tsx`
  - `src/components/profile/ProfileClient.tsx`

### src/lib/directus.ts (facade)
- Purpose: compatibility re-export layer for client Directus functions/types.
- Used by: no direct imports (domain modules used instead).

## Directus Collections Summary
- Users: `USERS_TABLE` (legacy, default `usuarios`)
- Stories: `STORIES_TABLE` (default `usuarios_storie`)
- Roles: `directus_roles`
- System users: `directus_users`
- News: `noticias`, `noticias_coment`, `noticias_coment_curtidas`
- Forum: `forum_topicos`, `forum_posts`, `forum_cat`, `forum_coment`,
  `forum_coment_curtidas`, `forum_interacoes`, `forum_topicos_votos`

## Notes
- Server modules use `directusService` + service token for privileged operations.
- Client modules use the public SDK and should keep queries read-only.
