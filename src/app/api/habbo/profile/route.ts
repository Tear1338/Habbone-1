// app/api/habbo/profile/route.ts
import { NextResponse } from 'next/server';
import {
  getHabboUserByName,
  getHabboUserById,
  getHabboUserProfileById,
  getHabboFriendsById,
  getHabboGroupsById,
  getHabboRoomsById,
  getHabboBadgesById,
  getHabboAchievementsById,
  getAllAchievements,
} from '@/server/habbo-cache';
import { buildHabboProfilePayload, resolveHabboProfileSettled } from '@/server/habbo-profile';
import { HabboProfileQuerySchema, searchParamsToObject, formatZodError, buildError } from '@/types/api';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = HabboProfileQuerySchema.safeParse(searchParamsToObject(searchParams));
      if (!parsed.success) {
        return NextResponse.json(
          buildError('Erreur de validation', { code: 'VALIDATION_ERROR', fields: formatZodError(parsed.error).fieldErrors }),
          { status: 400 }
        );
      }

      const isLite = Boolean((parsed.data as any).lite);

    // 1) Core user (récupère uniqueId)
    const core = 'id' in parsed.data
      ? await getHabboUserById(parsed.data.id)
      : await getHabboUserByName(parsed.data.name);
      const uniqueId = core?.uniqueId;
      if (!uniqueId) {
        return NextResponse.json(
          { error: 'Utilisateur Habbo introuvable.' },
          { status: 404 }
        );
      }

      // Lite mode: only user + profile (reduces calls drastically)
      if (isLite) {
        const onlyProfile = await Promise.allSettled([
          getHabboUserProfileById(uniqueId),
        ]);
        const profile = onlyProfile[0].status === 'fulfilled' ? onlyProfile[0].value : null;
        return NextResponse.json(
          buildHabboProfilePayload({
            core,
            profile,
            uniqueId,
            lite: true,
          }),
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

    // 2) Appels parallèles, tolérants aux profils privés
      const [profileRes, friendsRes, groupsRes, roomsRes, badgesRes, achievementsRes, achievementsCatalogRes] = await Promise.allSettled([
        getHabboUserProfileById(uniqueId),
        getHabboFriendsById(uniqueId),
        getHabboGroupsById(uniqueId),
        getHabboRoomsById(uniqueId),
        getHabboBadgesById(uniqueId),
        getHabboAchievementsById(uniqueId),
        getAllAchievements(),
      ]);

    const {
      profile,
      friends,
      groups,
      rooms,
      badgesRaw,
      achievements,
      achievementsTotal,
    } = resolveHabboProfileSettled({
      profileRes,
      friendsRes,
      groupsRes,
      roomsRes,
      badgesRes,
      achievementsRes,
      achievementsCatalogRes,
    });

    // ---- Enrich badges with reliable album/image hints using achievements catalog ----
    return NextResponse.json(
      buildHabboProfilePayload({
        core,
        profile,
        friends,
        groups,
        rooms,
        badgesRaw,
        achievements,
        achievementsTotal,
        uniqueId,
      }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (e: any) {
    const msg = e?.message || '';
    const notFound = /404/.test(msg);
    return NextResponse.json(
      buildError(notFound ? 'Utilisateur Habbo introuvable.' : 'Erreur Habbo API', { code: notFound ? 'HABBO_NOT_FOUND' : 'HABBO_ERROR' }),
      { status: notFound ? 404 : 502 }
    );
  }
}
