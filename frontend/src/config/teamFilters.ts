const STORAGE_KEY = 'team.non_business_departments';

export const DEFAULT_NON_BUSINESS_DEPARTMENTS = ['원장실', '경영지원본부'];

const normalize = (value: string) => value.trim();

export function getNonBusinessDepartments(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_NON_BUSINESS_DEPARTMENTS];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_NON_BUSINESS_DEPARTMENTS];
    }

    const normalized = parsed
      .filter((item) => typeof item === 'string')
      .map((item) => normalize(item))
      .filter(Boolean);

    if (normalized.length === 0) {
      return [...DEFAULT_NON_BUSINESS_DEPARTMENTS];
    }

    return Array.from(new Set(normalized));
  } catch {
    return [...DEFAULT_NON_BUSINESS_DEPARTMENTS];
  }
}

export function saveNonBusinessDepartments(departments: string[]) {
  const cleaned = Array.from(
    new Set(departments.map((item) => normalize(item)).filter(Boolean)),
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  window.dispatchEvent(new Event('nonBusinessDepartmentsChanged'));
}

export function getNonBusinessDepartmentsStorageKey() {
  return STORAGE_KEY;
}
