import axios, { AxiosError } from 'axios';

const STORAGE_KEYS = {
  access: '@daystore/access',
  refresh: '@daystore/refresh',
  user: '@daystore/user',
};

export const tokenStorage = {
  getAccess: () => localStorage.getItem(STORAGE_KEYS.access),
  setAccess: (t: string) => localStorage.setItem(STORAGE_KEYS.access, t),
  getRefresh: () => localStorage.getItem(STORAGE_KEYS.refresh),
  setRefresh: (t: string) => localStorage.setItem(STORAGE_KEYS.refresh, t),
  getUser: <T>() => {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  setUser: <T>(u: T) =>
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u)),
  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.access);
    localStorage.removeItem(STORAGE_KEYS.refresh);
    localStorage.removeItem(STORAGE_KEYS.user);
  },
};

const api = axios.create({
  baseURL: '',
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post<{
      accessToken: string;
      refreshToken: string;
    }>('/api/negocio/auth/refresh', { refreshToken: refresh });
    tokenStorage.setAccess(data.accessToken);
    tokenStorage.setRefresh(data.refreshToken);
    return data.accessToken;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const original = error.config as
      | (typeof error.config & { _retried?: boolean })
      | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes('/auth/login')
    ) {
      original._retried = true;
      if (!refreshPromise) refreshPromise = refreshTokens();
      const nuevoToken = await refreshPromise;
      refreshPromise = null;
      if (nuevoToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>)['Authorization'] =
          `Bearer ${nuevoToken}`;
        return api.request(original);
      }
      // Refresh fallido: forzamos relogin.
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
