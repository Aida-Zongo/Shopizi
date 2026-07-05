import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Robust refresh token handling:
 * - Prevents multiple simultaneous refresh attempts.
 * - Queues requests that fail with 401 while a refresh is in flight.
 * - Clears queue and redirects to login on refresh failure.
 */
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

function processQueue(error: unknown | null, accessToken: string | null) {
  refreshQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      resolve(api(config));
    }
  });
  refreshQueue = [];
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue this request until the refresh finishes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post<ApiResponse>(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        if (response.data.success && response.data.data && (response.data.data as any).accessToken) {
          const { accessToken, refreshToken } = response.data.data as { accessToken: string; refreshToken: string };
          localStorage.setItem('accessToken', accessToken);
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          // Retry queued requests
          processQueue(null, accessToken);
          return api(originalRequest);
        } else {
          throw new Error('Invalid refresh response');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Helper to extract a user-friendly error message from an Axios error.
 */
export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse | undefined;
    if (data?.error?.message) return data.error.message;
    if (typeof data?.error === 'string') return data.error;
    return error.message || 'Erreur réseau';
  }
  if (error instanceof Error) return error.message;
  return 'Une erreur inconnue est survenue';
}

export default api;
