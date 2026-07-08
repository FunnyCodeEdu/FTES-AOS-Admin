import axios, {
  AxiosError,
  AxiosRequestConfig,
  type AxiosInstance,
  type AxiosResponse,
} from "axios";
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
    public readonly retryable = false,
    /** Backend errorCode leaf (envelope.data.errorCode), vd "CTV_INVITE_EXPIRED". */
    public readonly errorCode?: string
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

// Core client: endpoint không nằm dưới /admin — creator course/section/lesson
// (`/api/v1/courses/*`) và lesson content (`/api/v1/lessons/*`). Dùng chung
// interceptor (token + unwrap envelope + refresh 401) với apiClient.
export const coreClient = axios.create({
  baseURL: `${API_ROOT}/api/v1`,
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

// Cài interceptor (token + unwrap envelope + refresh-401) cho 1 client; retry 401
// bằng CHÍNH client đó. Dùng cho cả apiClient (/admin) lẫn coreClient (/api/v1).
function installInterceptors(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
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
          return client(originalRequest);
        } catch {
          useAuthStore.getState().clearSession();
          redirectToLogin();
          return Promise.reject(new ApiError(401, "Phiên đăng nhập đã hết hạn"));
        }
      }

      return Promise.reject(normalizeError(error));
    }
  );
}

installInterceptors(apiClient);
installInterceptors(coreClient);

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
    // Giữ errorCode + message backend từ envelope {code,message,data:{errorCode}} để feature
    // map lỗi theo mã (vd CTV_INVITE_EXPIRED). error.message của axios là generic ("Request failed…").
    const envelope = error.response.data as ApiEnvelope<{ errorCode?: string }> | undefined;
    const errorCode = envelope?.data?.errorCode;
    if (status && status >= 500) {
      return new ApiError(status, "Máy chủ gặp lỗi. Vui lòng thử lại sau.", false, errorCode);
    }
    return new ApiError(status ?? 0, envelope?.message ?? error.message, false, errorCode);
  }

  if (error instanceof Error) {
    return new ApiError(0, error.message);
  }

  return new ApiError(0, "Đã có lỗi xảy ra");
}
