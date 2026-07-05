import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { OnboardingData } from "../shared/types";

const queryKeys = {
  onboarding: (token: string) => ["ctv", "onboarding", token] as const,
};

export function useOnboarding(token: string | undefined) {
  return useQuery<OnboardingData, Error>({
    queryKey: queryKeys.onboarding(token ?? ""),
    queryFn: async () => {
      void apiClient;
      if (token === "expired") {
        const err = new Error("INVITE_EXPIRED");
        err.name = "InviteExpiredError";
        throw err;
      }
      if (token === "wrong") {
        const err = new Error("WRONG_EMAIL");
        err.name = "WrongEmailError";
        throw err;
      }
      return {
        invite: {
          email: "ctv@example.com",
          scopes: [{ scopeType: "GROUP", scopeId: "g-1", scopeName: "Học Toán 12" }],
          permissions: ["community.report.view", "community.report.resolve"],
          grantExpiresAt: "2026-12-31T00:00:00Z",
          invitedByName: "Admin A",
          note: "CTV quản group Toán 12",
        },
        checklist: [
          { key: "terms", title: "Điều khoản CTV", content: "Cam kết hoạt động đúng quy định.", required: true },
          { key: "guide", title: "Hướng dẫn quản group", content: "Cách kiểm duyệt nội dung.", required: true },
          { key: "commit", title: "Cam kết trách nhiệm", required: true },
        ],
      };
    },
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptOnboarding() {
  const qc = useQueryClient();
  return useMutation<void, Error, { token: string; acknowledgedItems: string[] }>({
    mutationFn: async ({ token }) => {
      void apiClient;
      void token;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: ["ctv", "me", "scopes"] });
    },
  });
}
