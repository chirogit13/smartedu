/**
 * Defensive readers for loosely typed Laravel API payloads
 * ({ error, message, data, code }). They never throw and return null
 * when a field is missing, so the UI can show "—" instead of invented values.
 */
export type Loose = Record<string, unknown> | null;

export const obj = (v: unknown): Loose =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Rows of a plain or Laravel-paginated list response. */
export function listRows(payload: unknown): unknown[] {
  const root = obj(payload);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data;
  const data = obj(root.data);
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

/** `total` of a paginated response, or the row count of a plain list. */
export function totalCount(payload: unknown): number | null {
  const root = obj(payload);
  if (!root) return null;
  const data = obj(root.data);
  const total = (data && data.total) ?? root.total;
  if (typeof total === 'number') return total;
  if (Array.isArray(root.data)) return root.data.length;
  if (data && Array.isArray(data.data)) return data.data.length;
  return null;
}

/** Average of `result.percentage` across exam-marks rows (student & parent APIs). */
export function averagePercentage(payload: unknown): number | null {
  const values = listRows(payload)
    .map((item) => Number(obj(obj(item)?.result)?.percentage))
    .filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** Present-day percentage from an attendance payload ({ attendance: [{ type }] }). */
export function attendancePercentage(payload: unknown): number | null {
  const root = obj(payload);
  const data = obj(root?.data);
  const rows = arr(data?.attendance);
  if (rows.length === 0) return null;
  const present = rows.filter((r) => Number(obj(r)?.type) === 1).length;
  return Math.round((present / rows.length) * 100);
}

export function str(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
}
