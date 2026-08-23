import { useMutation, useQuery } from "@tanstack/react-query";
import { authClient, coreClient } from "../../shared/api/client";
import { graphqlRequest } from "../../shared/api/graphql";
import { useAuthStore, type ScopedGrant, type Session, type User } from "./store";

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  twoFactorRequired: boolean;
  twoFactorToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

// Backend /api/v1/auth trả TokenResponse (envelope.data đã unwrap).
interface BackendTokenResponse {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number;
  refreshExpiresIn?: number;
  tokenType?: string;
  mfaRequired: boolean | null;
  challengeId: string | null;
}

function toLoginResponse(t: BackendTokenResponse): LoginResponse {
  return {
    twoFactorRequired: t.mfaRequired === true,
    twoFactorToken: t.challengeId ?? undefined,
    accessToken: t.accessToken ?? undefined,
    refreshToken: t.refreshToken ?? undefined,
    expiresIn: t.expiresIn,
  };
}

export interface Verify2FARequest {
  twoFactorToken: string;
  otp: string;
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface MeResponse {
  user: User;
  permissions: string[];
  scopedGrants: Session["scopedGrants"];
  /**
   * Caller có grant SUPER_ADMIN active. KHÔNG suy ra được từ `permissions`: engine BE bypass ở
   * `EffectivePermissions.allows()` còn `permissionCodes()` chỉ gom grant tường minh, nên
   * SUPER_ADMIN thuần trả về danh sách quyền RỖNG dù được phép mọi thứ.
   */
  superAdmin: boolean;
}

/**
 * Đọc cờ SUPER_ADMIN từ REST `/api/v1/identity/me/permissions` (RbacQueryService.me →
 * `eff.superAdmin()`) — cùng engine đã tính `permissions`, chỉ khác surface.
 *
 * Vì sao KHÔNG hỏi qua GraphQL `me { superAdmin }`: field đó chưa có trên BE đang chạy. Hỏi một
 * field không tồn tại thì GraphQL trả lỗi validation cho CẢ query ⇒ `useMe` fail ⇒ permissions rỗng
 * ⇒ toàn bộ UI admin biến mất, tức FE bị buộc chặt vào thứ tự deploy của BE. REST không có ràng
 * buộc đó. Khi `Viewer.superAdmin` đã lên production ổn định thì chuyển sang GraphQL được, giá trị
 * y hệt vì cùng đọc `EffectivePermissions.superAdmin()`.
 *
 * Best-effort: lỗi mạng/endpoint → false (fail-closed) để một surface phụ không đánh sập `me`.
 */
async function fetchSuperAdmin(): Promise<boolean> {
  try {
    const res = await coreClient.get<{ superAdmin?: boolean }>("/identity/me/permissions");
    return res.data?.superAdmin === true;
  } catch {
    return false;
  }
}

export function useLogin() {
  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: (values) =>
      authClient
        .post("/login", { identifier: values.email, password: values.password })
        .then((r) => toLoginResponse(r.data as BackendTokenResponse)),
  });
}

export interface GoogleLoginRequest {
  /** id_token do Google Identity Services trả về. */
  idToken: string;
}

export interface GithubLoginRequest {
  /** authorization code GitHub trả về ở callback. */
  code: string;
}

/**
 * Đăng nhập bằng Google: đổi id_token GIS lấy TokenResponse của BE.
 * Trả về đúng `LoginResponse` như `useLogin` (có nhánh 2FA), nên post-login flow chia sẻ chung.
 */
export function useGoogleLogin() {
  return useMutation<LoginResponse, Error, GoogleLoginRequest>({
    mutationFn: (values) =>
      authClient
        .post("/google", { idToken: values.idToken })
        .then((r) => toLoginResponse(r.data as BackendTokenResponse)),
  });
}

/**
 * Đăng nhập bằng GitHub: đổi authorization code lấy TokenResponse của BE.
 * Cùng shape `LoginResponse` với `useLogin`.
 */
export function useGithubLogin() {
  return useMutation<LoginResponse, Error, GithubLoginRequest>({
    mutationFn: (values) =>
      authClient
        .post("/github", { code: values.code })
        .then((r) => toLoginResponse(r.data as BackendTokenResponse)),
  });
}

export function useVerify2FA() {
  return useMutation<TokensResponse, Error, Verify2FARequest>({
    mutationFn: (values) =>
      authClient
        .post("/mfa/verify", { challengeId: values.twoFactorToken, code: values.otp })
        .then((r) => {
          const t = r.data as BackendTokenResponse;
          return {
            accessToken: t.accessToken ?? "",
            refreshToken: t.refreshToken ?? "",
            expiresIn: t.expiresIn,
          } as TokensResponse;
        }),
  });
}

export function useLogout() {
  return useMutation<void, Error, void>({
    mutationFn: () =>
      authClient
        .post("/logout", { refreshToken: useAuthStore.getState().refreshToken })
        .then(() => undefined),
  });
}

/** Query key của `me` — dùng chung cho useMe và đường nạp thẳng khi vừa đăng nhập xong. */
export const ME_QUERY_KEY = ["auth", "me"] as const;

/**
 * Nạp `me` KHÔNG phụ thuộc hook: đọc token qua interceptor của client (store đã set trước đó).
 *
 * Tách rời khỏi `useMe` vì `useMe` bị gác `enabled: accessToken !== null` — ngay sau khi đăng nhập,
 * observer vẫn đang disabled trong tick đó nên `refetch()` là NO-OP (React Query v5 tôn trọng
 * `enabled` cả khi refetch thủ công). Đó chính là lý do phải bấm đăng nhập HAI LẦN.
 */
export async function fetchMe(): Promise<MeResponse> {
  const storeUser = useAuthStore.getState().user;
  return meQueryFn(storeUser);
}

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const storeUser = useAuthStore((s) => s.user);
  return useQuery<MeResponse, Error>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => meQueryFn(storeUser),
    enabled: accessToken !== null,
    staleTime: 5 * 60 * 1000,
  });
}

async function meQueryFn(storeUser: User | null | undefined): Promise<MeResponse> {
  {
      // Hai surface song song: GraphQL cho permissions/scopedGrants, REST cho cờ superAdmin.
      const [data, superAdmin] = await Promise.all([
        graphqlRequest<{
          me: {
            // PublicUser của chính caller. TRƯỚC ĐÂY query này KHÔNG hỏi `user`, nên `me.user` chỉ
            // là fallback `{id:"",…}` — và vì `useFinishSession` lấy chính `data.user` đó bỏ vào
            // store, `me.user.id` là chuỗi RỖNG suốt cả phiên. Mọi so sánh "tôi có phải chủ khoá
            // không" (MyCourseDetailPage) vì thế luôn sai, và tên tài khoản góc phải luôn hiện
            // "Admin". Ba field dưới đã verify tồn tại trên BE apitest (introspect type PublicUser)
            // — hỏi field lạ sẽ làm hỏng CẢ query, tức toàn bộ UI admin trắng.
            user: { id: string; username: string; displayName: string | null };
            permissions: string[];
            scopedGrants: Array<{
              roleCode: string;
              scopeType: ScopedGrant["scopeType"];
              scopeId: string | null;
              expiresAt?: string;
            }>;
          };
        }>(`query Me {
          me {
            user {
              id
              username
              displayName
            }
            permissions
            scopedGrants {
              roleCode
              scopeType
              scopeId
              expiresAt
            }
          }
        }`),
        fetchSuperAdmin(),
      ]);
      return {
        // id/fullName lấy từ BE; email GraphQL không trả (PublicUser không có field đó) nên giữ
        // giá trị đã có trong store nếu phiên trước lưu được.
        user: {
          id: data.me.user.id,
          email: storeUser?.email ?? "",
          fullName: data.me.user.displayName || data.me.user.username,
        } as User,
        permissions: data.me.permissions,
        scopedGrants: data.me.scopedGrants.map((g) => ({
          permission: g.roleCode,
          scopeType: g.scopeType,
          scopeId: g.scopeId,
          expiresAt: g.expiresAt,
        })),
        superAdmin,
      };
  }
}
