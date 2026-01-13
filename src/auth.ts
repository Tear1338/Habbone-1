// src/auth.ts
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {
  listUsersByNick,
  normalizeHotelCode,
  passwordsMatch,
  upgradePasswordToBcrypt,
  isBcrypt,
  asTrue,
  asFalse,
  tryUpdateHabboSnapshotForUser,
} from '@/server/directus/users';
import { listRoles } from '@/server/directus/roles';
import { getHabboUserByNameForHotel } from '@/server/habbo-cache';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        nick: { label: 'Pseudo Habbo', type: 'text' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      authorize: async (creds) => {
        const nick = (creds?.nick as string | undefined || '').trim();
        const password = (creds?.password as string | undefined) || '';
        if (!nick || !password) return null;

        const candidates = await listUsersByNick(nick);
        if (!candidates.length) return null;

        let user: any = null;
        for (const candidate of candidates) {
          if (passwordsMatch(password, candidate.senha)) {
            user = candidate;
            break;
          }
        }

        if (!user) return null;

        const hotelCode = normalizeHotelCode((user as any)?.habbo_hotel);

        // Dans ta base, ativado/banido sont 's' / 'n'
        if (asTrue(user.banido)) throw new Error('Compte banni.');
        if (asFalse(user.ativado)) throw new Error('Compte non activé.');

        if (!isBcrypt(user.senha)) {
          try {
            await upgradePasswordToBcrypt(Number(user.id), password);
          } catch {
            // on ignore en cas d'échec d'upgrade silencieux
          }
        }

        try {
          const core = await getHabboUserByNameForHotel(user.nick, hotelCode, { cache: false });
          void tryUpdateHabboSnapshotForUser(Number(user.id), core);
        } catch {}

        const rawRoleValue = String((user as any).role || '');
        const rawRole = rawRoleValue.toLowerCase();
        const status = String((user as any).status || '').toLowerCase();
        const adminNicks = (process.env.ADMIN_NICKS || '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const isAdminByStatus = ['admin', 'adm', 'owner', 'staff'].includes(status);
        const isAdminByNick = adminNicks.includes(String(user.nick || '').toLowerCase());
        const adminRoles = new Set(['admin', 'adm', 'owner', 'staff', 'fondateur', 'responsable', 'responsables']);
        let directusRoleId: string | null = null;
        let directusRoleName: string | null = rawRoleValue || null;
        let directusAdminAccess = false;
        try {
          const roles = await listRoles();
          const match = roles.find((r) => String(r?.name || '').toLowerCase() === rawRole);
          if (match) {
            directusRoleId = String(match.id);
            directusRoleName = match.name ?? directusRoleName;
            directusAdminAccess = match.admin_access === true;
          }
        } catch {}
        const fallbackAdmin = !directusRoleId && adminRoles.has(rawRole);
        const computedAdminAccess = directusAdminAccess || isAdminByStatus || isAdminByNick || fallbackAdmin;
        const role = computedAdminAccess ? 'admin' : 'member';

        return {
          id: String(user.id),
          nick: user.nick,
          email: user.email || null,
          avatar: user.avatar || null,
          missao: user.missao || null,
          hotel: hotelCode,
          role,
          directusRoleId,
          directusRoleName,
          directusAdminAccess: computedAdminAccess,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).uid = (user as any).id;
        (token as any).nick = (user as any).nick;
        (token as any).avatar = (user as any).avatar;
        (token as any).missao = (user as any).missao;
        (token as any).hotel = (user as any).hotel ?? 'fr';
        (token as any).role = (user as any).role ?? 'member';
        (token as any).email = (user as any).email ?? null;
        (token as any).directusRoleId = (user as any).directusRoleId ?? null;
        (token as any).directusRoleName = (user as any).directusRoleName ?? null;
        (token as any).directusAdminAccess = (user as any).directusAdminAccess === true;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user = {
        id: (token as any).uid,
        nick: (token as any).nick,
        avatar: (token as any).avatar,
        missao: (token as any).missao,
        hotel: (token as any).hotel ?? 'fr',
        role: (token as any).role,
        email: (token as any).email,
        directusRoleId: (token as any).directusRoleId ?? null,
        directusRoleName: (token as any).directusRoleName ?? null,
        directusAdminAccess: (token as any).directusAdminAccess === true,
      };
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};
