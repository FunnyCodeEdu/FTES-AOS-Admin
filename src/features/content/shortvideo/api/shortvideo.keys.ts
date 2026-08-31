import type { ClipListParams } from "../types";

/** Query-key factory cho Studio video ngắn (mirror `payroll.keys` / `questionBank.keys`). */
export const shortVideoKeys = {
  all: ["admin", "shortvideo"] as const,
  clips: () => [...shortVideoKeys.all, "clips"] as const,
  clipList: (params: ClipListParams) => [...shortVideoKeys.clips(), "list", params] as const,
  clip: (id: string | undefined) =>
    id ? ([...shortVideoKeys.clips(), "detail", id] as const) : shortVideoKeys.clips(),
  highlightJob: (jobId: string | undefined) =>
    jobId
      ? ([...shortVideoKeys.all, "highlight-job", jobId] as const)
      : ([...shortVideoKeys.all, "highlight-job"] as const),
};
