import { useAuthStore } from "../../../auth/store";

export function useCurrentUserId(): string | undefined {
  return useAuthStore((s) => s.user?.id);
}
