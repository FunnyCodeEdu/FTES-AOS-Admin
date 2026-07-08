import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, coreClient } from "../../../shared/api/client";
import type { OnboardingData } from "../shared/types";

const queryKeys = {
  onboarding: (token: string) => ["ctv", "onboarding", token] as const,
};

// Onboarding self-service sống ở /api/v1/ctv/... (KHÔNG /admin) → coreClient.
// BE view chỉ trả invite detail; checklist là nội dung tĩnh FE sở hữu (T&C).
const ONBOARDING_CHECKLIST = [
  { key: "terms", title: "Điều khoản CTV", content: "Cam kết hoạt động đúng quy định.", required: true },
  { key: "guide", title: "Hướng dẫn quản group", content: "Cách kiểm duyệt nội dung.", required: true },
  { key: "commit", title: "Cam kết trách nhiệm", required: true },
];

interface OnboardingViewResponse {
  email: string;
  scopes: { scopeType: string; scopeId: string; scopeName: string }[];
  permissions: string[];
  inviterName: string;
  grantExpiresAt: string;
  expiresAt: string;
  status: string;
}

// Map BE errorCode → error names/messages mà OnboardingPage đang dựa vào (error.name).
// NOT_FOUND gộp vào InviteExpiredError vì UI copy "hết hạn hoặc bị thu hồi" phủ được.
function throwOnboardingError(err: unknown): never {
  const errorCode = err instanceof ApiError ? err.errorCode : undefined;
  if (errorCode === "CTV_INVITE_EXPIRED" || errorCode === "CTV_INVITE_NOT_FOUND") {
    const e = new Error("INVITE_EXPIRED");
    e.name = "InviteExpiredError";
    throw e;
  }
  if (errorCode === "CTV_INVITE_WRONG_EMAIL") {
    const e = new Error("WRONG_EMAIL");
    e.name = "WrongEmailError";
    throw e;
  }
  throw err;
}

export function useOnboarding(token: string | undefined) {
  return useQuery<OnboardingData, Error>({
    queryKey: queryKeys.onboarding(token ?? ""),
    queryFn: async () => {
      try {
        const res = await coreClient.get<OnboardingViewResponse>(`/ctv/onboarding/${token}`);
        const d = res.data;
        return {
          invite: {
            email: d.email,
            scopes: d.scopes,
            permissions: d.permissions,
            grantExpiresAt: d.grantExpiresAt,
            invitedByName: d.inviterName,
          },
          checklist: ONBOARDING_CHECKLIST,
        };
      } catch (err) {
        throwOnboardingError(err);
      }
    },
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptOnboarding() {
  const qc = useQueryClient();
  return useMutation<void, Error, { token: string; acknowledgedItems: string[] }>({
    mutationFn: async ({ token, acknowledgedItems }) => {
      try {
        await coreClient.post(`/ctv/onboarding/${token}/accept`, { acknowledgedItems });
      } catch (err) {
        throwOnboardingError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: ["ctv", "me", "scopes"] });
    },
  });
}
