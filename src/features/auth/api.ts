import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../shared/api/client";
import { useAuthStore, type Session, type User } from "./store";

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
      apiClient.post("/auth/login", values).then((r) => r.data as LoginResponse),
  });
}

export function useVerify2FA() {
  return useMutation<TokensResponse, Error, Verify2FARequest>({
    mutationFn: (values) =>
      apiClient
        .post("/auth/2fa/verify", values)
        .then((r) => r.data as TokensResponse),
  });
}

export function useLogout() {
  return useMutation<void, Error, void>({
    mutationFn: () =>
      apiClient
        .post("/auth/logout", { refreshToken: useAuthStore.getState().refreshToken })
        .then(() => undefined),
  });
}

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<MeResponse, Error>({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get("/auth/me").then((r) => r.data as MeResponse),
    enabled: accessToken !== null,
    staleTime: 5 * 60 * 1000,
  });
}
