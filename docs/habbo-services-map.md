# Habbo Services Map

This report maps Habbo API calls, internal aggregation, caching, and UI usage.

## Overview
- External Habbo API base defaults to `https://www.habbo.fr` and varies by hotel.
- Server layer wraps Habbo API calls with TTL cache + in-flight dedup.
- Client layer calls a single internal endpoint `/api/habbo/profile`.
- Avatars and badge images use Habbo CDNs (no API auth).

## External Habbo Endpoints (src/lib/habbo.ts)
Base: `HABBO_API_BASE` (default `https://www.habbo.fr`) or hotel base via `resolveHotelBase(hotel)`.

Core user:
- `GET {base}/api/public/users?name={name}`
- `GET {base}/api/public/users/{id}`

Profile and related data (by uniqueId):
- `GET {base}/api/public/users/{id}/profile`
- `GET {base}/api/public/users/{id}/friends`
- `GET {base}/api/public/users/{id}/groups`
- `GET {base}/api/public/users/{id}/rooms`
- `GET {base}/api/public/users/{id}/badges`
- `GET {base}/api/public/achievements/{id}`
- `GET {base}/api/public/achievements` (catalog)

## Server Layer (aggregation + cache)

### src/server/habbo-cache.ts
- Purpose: server-side TTL cache and in-flight de-dup for all Habbo calls.
- TTLs: core 24h, heavy 6h, achievements catalog 24h.
- Keyed by hotel base + id or name for hotel-aware caching.
- Supports `options.cache === false` for bypass.

### src/server/habbo-profile-core.ts
- Purpose: build a single payload with optional lite mode.
- `enrichHabboBadges` uses achievements catalog to infer badge album.
- `buildHabboProfilePayload` shapes full vs lite response.
- `resolveHabboProfileSettled` tolerates partial failures.

### src/app/api/habbo/profile/route.ts
- Purpose: internal API for client consumption.
- Inputs: `?name=` or `?id=`, optional `&lite=1`.
- Calls:
  - Always: `getHabboUserByName` or `getHabboUserById`
  - Lite: `getHabboUserProfileById`
  - Full: profile + friends + groups + rooms + badges + achievements + catalog
- Response: `HabboProfileResponse` (see `src/types/habbo.ts`).
- Cache headers: `Cache-Control: no-store` (server cache still applies).

## Client Layer (fetch + cache)

### src/lib/habbo-client.ts
- Purpose: build and call `/api/habbo/profile`.
- Methods: `fetchHabboProfileByName`, `fetchHabboProfileById`.
- Options: `lite`, `cache`, `signal`, `fallbackMessage`.

### src/lib/use-habbo-profile.ts
- Purpose: React hook for profile data with client-side cache.
- Uses `cachedValue` from `src/lib/client-cache.ts`.
- Optional TTL (e.g. header uses 30s).
- Exposes `{ data, error, loading, refresh }`.

### src/types/habbo.ts and src/types/habbo-client.d.ts
- Defines `HabboProfileResponse` shape.
- Declares window globals: `__habboProfile`, `__habboLevel`.
- Declares custom event: `habbo:profile`.

## UI Usage (avatars + badges)

### src/lib/habbo-imaging.ts
- Purpose: build avatar image URLs.
- Endpoint: `{base}/habbo-imaging/avatarimage?user=...`
- Base: `NEXT_PUBLIC_HABBO_BASE` or default `https://www.habbo.fr`.

Used by:
- `src/components/profile/modules/HabboAvatar.tsx`
- `src/components/forum/CommentBubble.tsx`
- `src/components/layout/header/UserBarLeft.tsx`
- `src/components/layout/header/TopBar.tsx`
- `src/app/team/page.tsx`
- `src/app/forum/topic/[id]/page.tsx`
- `src/components/profile/ProfileClient.tsx`

### src/components/profile/modules/BadgeIcon.tsx
- Purpose: resolve badge image URLs from Habbo CDNs.
- Bases:
  - `NEXT_PUBLIC_HABBO_C_IMAGES_BASE` (default `https://images.habbo.com/c_images`)
  - `NEXT_PUBLIC_HABBO_EUSSL_C_IMAGES_BASE` (default `https://images-eussl.habbo.com/c_images`)
  - `NEXT_PUBLIC_HABBO_ALT_C_IMAGES_BASE` (default `https://habboo-a.akamaihd.net/c_images`)
- Falls back across albums and legacy paths.

## Feature Call Sites (frequency)

### Login (server)
- `src/auth.ts` uses `getHabboUserByNameForHotel(..., { cache: false })` to update snapshot.
- Trigger: on credentials login.

### Registration (server)
- `src/app/api/register/route.ts` uses `getHabboUserByNameForHotel(..., { cache: false })`.
- Trigger: each register request.

### Verification (server)
- `src/app/api/verify/status/route.ts` uses:
  - `getHabboUserByIdForHotel(..., { cache: false })` if uniqueId is known
  - fallback `getHabboUserByNameForHotel(..., { cache: false })`
- Trigger: each verification status check.

### Profile page (client)
- `src/components/profile/ProfileClient.tsx` uses `useHabboProfile` (full).
- Trigger: profile page mount, optional refresh.

### Header (client)
- `src/components/layout/header-tw.tsx` uses `useHabboProfile` with `lite` + TTL (30s).
- Trigger: header render; can reuse data broadcast from ProfileClient via `habbo:profile` event.

## Internal Data Flow Summary
- Client calls `/api/habbo/profile` via `fetchHabboProfileByName/Id`.
- Server aggregates multiple Habbo endpoints and returns a single response.
- Server cache reduces repeated external calls; client cache reduces repeated internal calls.

## Notes
- All external Habbo API fetches use `cache: no-store` at HTTP layer; caching is handled in-process via `habbo-cache`.
- Avatar and badge images are CDN-only; no Habbo API calls.
