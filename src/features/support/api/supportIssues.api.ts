import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";

export type IssueCategory = "AI" | "VIDEO" | "CHALLENGE" | "PAYMENT" | "OTHER";
export type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface SupportIssue {
  id: string;
  reporterId: string;
  reporterUsername?: string;
  reporterEmail?: string;
  category: IssueCategory;
  title: string;
  description: string;
  pageUrl: string;
  context: Record<string, unknown>;
  status: IssueStatus;
  assigneeId?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface IssuePage {
  items: SupportIssue[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IssueFilters {
  status?: IssueStatus;
  category?: IssueCategory;
  page: number;
  size: number;
}

export function useSupportIssues(filters: IssueFilters) {
  return useQuery<IssuePage, Error>({
    queryKey: ["support-issues", filters],
    queryFn: async () =>
      (await apiClient.get<IssuePage>("/support/issues", { params: filters })).data,
  });
}

export function useUpdateSupportIssue() {
  const queryClient = useQueryClient();
  return useMutation<SupportIssue, Error, { id: string; status: IssueStatus; adminNote?: string }>({
    mutationFn: async ({ id, ...body }) =>
      (await apiClient.patch<SupportIssue>(`/support/issues/${id}`, body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-issues"] }),
  });
}
