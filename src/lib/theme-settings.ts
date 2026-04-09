export type SiteThemeSettings = {
  headerLogoUrl: string;
  headerBackgroundColor: string;
  headerBackgroundImageUrl: string | null;
  showLogo: boolean;
};

export const DEFAULT_THEME_SETTINGS: SiteThemeSettings = {
  headerLogoUrl: '/img/HabbOne25_Logo_DefaultAnimated2_byLFM.gif',
  headerBackgroundColor: '#204E84',
  headerBackgroundImageUrl: null,
  showLogo: true,
};

const MAX_URL_LENGTH = 512;
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const LOCAL_URL_RE = /^\/[a-zA-Z0-9\-._~!$&'()*+,;=:@/%]*$/;

function isAllowedUrl(value: string): boolean {
  if (LOCAL_URL_RE.test(value)) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeUrl(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const value = input.trim();
  if (!value || value.length > MAX_URL_LENGTH) return fallback;
  if (isAllowedUrl(value)) return value;
  return fallback;
}

function normalizeOptionalUrl(input: unknown, fallback: string | null): string | null {
  if (input === null) return null;
  if (typeof input !== 'string') return fallback;
  const value = input.trim();
  if (!value) return null;
  if (value.length > MAX_URL_LENGTH) return fallback;
  return isAllowedUrl(value) ? value : fallback;
}

function normalizeColor(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const value = input.trim();
  if (!HEX_COLOR_RE.test(value)) return fallback;
  return value.toUpperCase();
}

export function normalizeThemeSettings(input: unknown): SiteThemeSettings {
  const source = (input && typeof input === 'object') ? (input as Record<string, unknown>) : {};
  return {
    headerLogoUrl: normalizeUrl(source.headerLogoUrl, DEFAULT_THEME_SETTINGS.headerLogoUrl),
    headerBackgroundColor: normalizeColor(source.headerBackgroundColor, DEFAULT_THEME_SETTINGS.headerBackgroundColor),
    headerBackgroundImageUrl: normalizeOptionalUrl(
      source.headerBackgroundImageUrl,
      DEFAULT_THEME_SETTINGS.headerBackgroundImageUrl,
    ),
    showLogo: typeof source.showLogo === 'boolean' ? source.showLogo : DEFAULT_THEME_SETTINGS.showLogo,
  };
}
