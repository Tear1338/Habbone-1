export type TimestampParseOptions = {
  numeric?: 'ms' | 'auto';
  numericString?: 'parse' | 'number';
  mysqlLike?: boolean;
};

export function parseTimestamp(value: unknown, options?: TimestampParseOptions): number {
  const numericMode = options?.numeric ?? 'ms';
  const numericString = options?.numericString ?? 'parse';
  const allowMysqlLike = options?.mysqlLike === true;

  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return numericMode === 'auto' ? (value > 1e12 ? value : value * 1000) : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    if (numericString === 'number') {
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        return numericMode === 'auto' ? (numeric > 1e12 ? numeric : numeric * 1000) : numeric;
      }
    }
    let parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed) && allowMysqlLike) {
      const mysqlLike = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
      if (mysqlLike) {
        parsed = Date.parse(`${mysqlLike[1]}T${mysqlLike[2]}Z`);
      }
    }
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function formatDateTimeFromString(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(+d) ? '' : d.toLocaleString();
}

export function formatDateTimeFromAny(value?: string | number | null): string {
  if (value == null) return '';
  return formatDateTimeFromString(String(value));
}

export function formatDateTimeSmart(value?: string | number | null): string {
  if (value == null) return '';
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(+d) ? '' : d.toLocaleString();
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const ms = numeric < 1e12 ? numeric * 1000 : numeric;
    const d = new Date(ms);
    return Number.isNaN(+d) ? '' : d.toLocaleString();
  }
  const d = new Date(value);
  return Number.isNaN(+d) ? '' : d.toLocaleString();
}

export function formatDateTimeLoose(value?: string | number | null): string {
  if (value == null || value === '') return '';
  try {
    if (typeof value === 'number') {
      const ms = value > 1e12 ? value : value * 1000;
      const d = new Date(ms);
      return Number.isNaN(+d) ? String(value) : d.toLocaleString();
    }
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && numeric > 0) {
      const ms = numeric > 1e12 ? numeric : numeric * 1000;
      const d = new Date(ms);
      return Number.isNaN(+d) ? String(value) : d.toLocaleString();
    }
    const d = new Date(value);
    return Number.isNaN(+d) ? String(value) : d.toLocaleString();
  } catch {
    return String(value);
  }
}

export function formatDateTimeNative(value: unknown): string {
  if (value == null) return '';
  const d = new Date(value as any);
  const output = d.toLocaleString?.();
  return output || String(value);
}

export function formatDateTimeFlexible(value?: unknown): string {
  if (value == null || value === '') return '';
  const ts = parseTimestamp(value, { numeric: 'auto', numericString: 'number', mysqlLike: true });
  return ts ? new Date(ts).toLocaleString() : '';
}

export function formatDateTimeShortFr(value?: unknown): string {
  const ts = parseTimestamp(value, { numeric: 'ms', numericString: 'parse' });
  if (!ts) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(ts);
  } catch {
    return '';
  }
}

export function formatDateShortFr(value?: unknown): string | null {
  const ts = parseTimestamp(value, { numeric: 'ms', numericString: 'parse' });
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}
