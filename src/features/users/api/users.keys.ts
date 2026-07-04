import type { SecurityLogParams, UserListParams } from "../types";

export const usersKeys = {
  all: ["admin", "users"] as const,
  lists: () => [...usersKeys.all, "list"] as const,
  list: (params: UserListParams) => [...usersKeys.lists(), params] as const,
  details: () => [...usersKeys.all, "detail"] as const,
  detail: (id: string | undefined) =>
    id ? ([...usersKeys.details(), id] as const) : usersKeys.details(),
  learning: (id: string | undefined) =>
    id ? ([...usersKeys.detail(id), "learning"] as const) : usersKeys.details(),
  transactions: (id: string | undefined) =>
    id ? ([...usersKeys.detail(id), "transactions"] as const) : usersKeys.details(),
  sessions: (id: string | undefined) =>
    id ? ([...usersKeys.detail(id), "sessions"] as const) : usersKeys.details(),
  securityLogs: (id: string | undefined) =>
    id ? ([...usersKeys.detail(id), "security-log"] as const) : usersKeys.details(),
  securityLog: (id: string | undefined, params: SecurityLogParams) =>
    id ? ([...usersKeys.securityLogs(id), params] as const) : usersKeys.securityLogs(id),
  export: (jobId: string | undefined) =>
    jobId ? ([...usersKeys.all, "export", jobId] as const) : ([...usersKeys.all, "export"] as const),
};
