import { createDirectus, rest } from '@directus/sdk';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
if (!DIRECTUS_URL) throw new Error('NEXT_PUBLIC_DIRECTUS_URL manquant');

export const directus = createDirectus(DIRECTUS_URL).with(rest());
export const directusUrl = DIRECTUS_URL;
