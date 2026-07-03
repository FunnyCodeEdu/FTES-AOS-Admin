import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../shared/api/client";

export interface WidgetDefinition {
  key: string;
  title: string;
  type: "stat" | "chart" | "list";
  requiredPermissions: string[];
  dataEndpoint: string;
}

export interface WidgetsResponse {
  widgets: WidgetDefinition[];
}

export function useWidgets() {
  return useQuery<WidgetsResponse, Error>({
    queryKey: ["dashboard", "widgets"],
    queryFn: () => apiClient.get("/dashboard/widgets").then((r) => r.data as WidgetsResponse),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWidgetData<T = unknown>(key: string, endpoint: string, enabled: boolean) {
  return useQuery<T, Error>({
    queryKey: ["dashboard", "widget", key],
    queryFn: () => apiClient.get(endpoint).then((r) => r.data as T),
    enabled: enabled && !!endpoint,
    staleTime: 60 * 1000,
  });
}
