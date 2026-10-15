const STORAGE_KEY = 'user';

export function getSession() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getToken() {
  return getSession()?.token ?? null;
}

export function setSession(userData) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}
