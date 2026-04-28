const normalizeBasePath = (value?: string): string => {
  if (!value || value === '/' || value === '.') {
    return '';
  }

  try {
    const parsed = new URL(value);
    return normalizeBasePath(parsed.pathname);
  } catch {
    const normalized = value.startsWith('/') ? value : `/${value}`;
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
  }
};

const detectRuntimeBasePath = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const path = window.location.pathname;

  if (path === '/gtp_rate' || path.startsWith('/gtp_rate/')) {
    return '/gtp_rate';
  }

  return '';
};

export const APP_BASE_PATH =
  detectRuntimeBasePath() || normalizeBasePath(process.env.REACT_APP_BASE_PATH || process.env.PUBLIC_URL);

export const withBasePath = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return APP_BASE_PATH ? `${APP_BASE_PATH}${normalizedPath}` : normalizedPath;
};
