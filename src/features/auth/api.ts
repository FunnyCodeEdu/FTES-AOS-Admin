import { useMutation, useQuery } from "@tanstack/react-query";
import { authClient } from "../../shared/api/client";
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
}

export function useLogin() {
  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: (values) =>
      authClient
        .post("/login", { identifier: values.email, password: values.password })
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

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const storeUser = useAuthStore((s) => s.user);
  return useQuery<MeResponse, Error>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const data = await graphqlRequest<{
        me: {
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
          permissions
          scopedGrants {
            roleCode
            scopeType
            scopeId
            expiresAt
          }
        }
      }`);
      return {
        user: storeUser ?? ({ id: "", email: "", fullName: "" } as User),
        permissions: data.me.permissions,
        scopedGrants: data.me.scopedGrants.map((g) => ({
          permission: g.roleCode,
          scopeType: g.scopeType,
          scopeId: g.scopeId,
          expiresAt: g.expiresAt,
        })),
      };
    },
    enabled: accessToken !== null,
    staleTime: 5 * 60 * 1000,
  });
}
