export function readViewPreferences<T>(pageKey: string, defaults: T): T {
  const raw = localStorage.getItem(pageKey);
  if (raw === null) return defaults;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.removeItem(pageKey);
    return defaults;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    localStorage.removeItem(pageKey);
    return defaults;
  }

  const result = { ...defaults } as any;
  for (const key of Object.keys(defaults as any)) {
    if (key in parsed) {
      result[key] = parsed[key];
    }
  }
  return result;
}

export function writeViewPreferences<T>(
  pageKey: string,
  prefs: T,
  defaults: T,
): void {
  const p = prefs as any;
  const d = defaults as any;
  const hasNonDefault = Object.keys(d).some((key) => p[key] !== d[key]);

  if (!hasNonDefault) {
    localStorage.removeItem(pageKey);
    return;
  }

  localStorage.setItem(pageKey, JSON.stringify(prefs));
}
