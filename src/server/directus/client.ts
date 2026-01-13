import 'server-only';

import {
  createDirectus,
  rest,
  readItems,
  readItem,
  createItem,
  updateItem,
  deleteItem,
  staticToken,
} from '@directus/sdk';

import type { DirectusRoleLite, DirectusUserLite } from './types';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN!;
export const USERS_TABLE = process.env.USERS_TABLE || 'usuarios';
export const STORIES_TABLE = process.env.STORIES_TABLE || 'usuarios_storie';
export const STORIES_FOLDER_ID = (process.env.DIRECTUS_FILES_FOLDER || '').trim() || null;

if (!DIRECTUS_URL) throw new Error('NEXT_PUBLIC_DIRECTUS_URL manquant');
if (!SERVICE_TOKEN) throw new Error('DIRECTUS_SERVICE_TOKEN manquant');

export type DirectusCmsSchema = {
  directus_roles: DirectusRoleLite;
  directus_users: DirectusUserLite;
} & Record<string, unknown>;

export const directusService = createDirectus<DirectusCmsSchema>(DIRECTUS_URL)
  .with(staticToken(SERVICE_TOKEN))
  .with(rest());

export const rItems = readItems as any;
export const rItem = readItem as any;
export const cItem = createItem as any;
export const uItem = updateItem as any;
export const dItem = deleteItem as any;

export const directusUrl = DIRECTUS_URL;
export const serviceToken = SERVICE_TOKEN;
