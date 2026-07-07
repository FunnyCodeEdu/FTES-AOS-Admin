import axios, { AxiosError, AxiosRequestConfig, type AxiosResponse } from "axios";
import { useAuthStore } from "../../features/auth/store";

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T | null;
}

export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly retryable = false
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ForbiddenError extends Error {
  constructor(public readonly missingPermissions: string[]) {
    super("Bạn không có quyền thực hiện thao tác này");
    this.name = "ForbiddenError";
  }
}

export class NetworkError extends Error {
  constructor(message = "Kết nối thất bại. Vui lòng thử lại.") {
    super(message);
    this.name = "NetworkError";
  }
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

const API_ROOT = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASE = `${API_ROOT}/api/v1/admin`;
const AUTH_BASE = `${API_ROOT}/api/v1/auth`;

// Backend envelope dùng HTTP-style code (200 = OK), KHÔNG phải 0. Success = 2xx.
export function isEnvelopeSuccess(code: number): boolean {
  return code >= 200 && code < 300;
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Auth (login/refresh/logout/mfa) nằm ở /api/v1/auth, KHÔNG dưới /admin.
export const authClient = axios.create({
  baseURL: AUTH_BASE,
  headers: { "Content-Type": "application/json" },
});

const PUBLIC_PATHS = ["/auth/login", "/auth/mfa/verify", "/auth/refresh"];

function isPublicRequest(config: AxiosRequestConfig): boolean {
  const url = config.url ?? "";
  return PUBLIC_PATHS.some((p) => url.includes(p));
}

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    throw new NetworkError("Không có phiên đăng nhập");
  }

  const res = await axios.post<ApiEnvelope<RefreshResponse>>(
    `${AUTH_BASE}/refresh`,
    { refreshToken }
  );

  const envelope = res.data;
  if (!isEnvelopeSuccess(envelope.code) || !envelope.data) {
    throw new ApiError(envelope.code, envelope.message);
  }

  const { accessToken, refreshToken: newRefreshToken } = envelope.data;
  useAuthStore.getState().setTokens(accessToken, newRefreshToken);
  return accessToken;
}

function redirectToLogin() {
  const returnUrl = encodeURIComponent(
    window.location.pathname + window.location.search
  );
  window.location.href = `/login?returnUrl=${returnUrl}`;
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res: AxiosResponse<ApiEnvelope<unknown>>) => {
    const envelope = res.data;
    if (!isEnvelopeSuccess(envelope.code)) {
      throw new ApiError(envelope.code, envelope.message);
    }
    return { ...res, data: envelope.data } as AxiosResponse<unknown>;
  },
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(normalizeError(error));
    }

    const status = error.response?.status;
    const envelope = error.response?.data;

    if (status === 403) {
      const missing =
        (envelope?.data as { missingPermissions?: string[] } | null)
          ?.missingPermissions ?? [];
      return Promise.reject(new ForbiddenError(missing));
    }

    if (status === 401 && !isPublicRequest(originalRequest)) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = doRefresh().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      try {
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().clearSession();
        redirectToLogin();
        return Promise.reject(new ApiError(401, "Phiên đăng nhập đã hết hạn"));
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

authClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authClient.interceptors.response.use(
  (res: AxiosResponse<ApiEnvelope<unknown>>) => {
    const envelope = res.data;
    if (!isEnvelopeSuccess(envelope.code)) {
      throw new ApiError(envelope.code, envelope.message);
    }
    return { ...res, data: envelope.data } as AxiosResponse<unknown>;
  },
  (error: AxiosError<ApiEnvelope<unknown>>) => Promise.reject(normalizeError(error))
);

export function normalizeError(error: unknown): ApiError | ForbiddenError | NetworkError {
  if (error instanceof ApiError) return error;
  if (error instanceof ForbiddenError) return error;
  if (error instanceof NetworkError) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (!error.response) {
      return new NetworkError();
    }
    if (status && status >= 500) {
      return new ApiError(status, "Máy chủ gặp lỗi. Vui lòng thử lại sau.");
    }
    return new ApiError(status ?? 0, error.message);
  }

  if (error instanceof Error) {
    return new ApiError(0, error.message);
  }

  return new ApiError(0, "Đã có lỗi xảy ra");
}
