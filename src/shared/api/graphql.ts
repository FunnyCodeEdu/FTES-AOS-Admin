import { useAuthStore } from "../../features/auth/store";
import { ApiError, ForbiddenError, NetworkError } from "./client";

export interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
    [key: string]: unknown;
  };
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export function toGraphQLSortOrder(order?: string | null): "ASC" | "DESC" | undefined {
  if (!order) return undefined;
  const normalized = order.toUpperCase();
  if (normalized === "ASC" || normalized === "ASCEND") return "ASC";
  if (normalized === "DESC" || normalized === "DESCEND") return "DESC";
  return undefined;
}

const GRAPHQL_ENDPOINT = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/v1/graphql`;

function hasAccessDenied(errors: GraphQLError[]): boolean {
  return errors.some(
    (e) =>
      e.extensions?.code === "ADMIN_ACCESS_DENIED" ||
      e.message?.includes("ADMIN_ACCESS_DENIED")
  );
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  let response: Response;
  try {
    response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new NetworkError();
  }

  let payload: GraphQLResponse<T>;
  try {
    payload = (await response.json()) as GraphQLResponse<T>;
  } catch {
    throw new ApiError(response.status, "Phản hồi không hợp lệ từ máy chủ");
  }

  if (payload.errors && payload.errors.length > 0) {
    if (hasAccessDenied(payload.errors)) {
      throw new ForbiddenError([]);
    }
    const first = payload.errors[0];
    throw new ApiError(0, first.message);
  }

  if (!response.ok) {
    throw new ApiError(response.status, "Yêu cầu thất bại");
  }

  if (payload.data === undefined) {
    throw new ApiError(0, "Không nhận được dữ liệu");
  }

  return payload.data;
}
