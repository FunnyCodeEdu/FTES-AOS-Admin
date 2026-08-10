import { useAuthStore } from "../../features/auth/store";
import { ApiError, ForbiddenError, NetworkError, refreshAccessToken } from "./client";

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

/** Một lượt POST tới endpoint GraphQL với token cho trước. Tách ra để retry sau khi refresh. */
async function send(
  query: string,
  variables: Record<string, unknown> | undefined,
  token: string | null
): Promise<Response> {
  try {
    return await fetch(GRAPHQL_ENDPOINT, {
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
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  let response = await send(query, variables, useAuthStore.getState().accessToken);

  // 401 giữa luồng → refresh 1 lần rồi retry ĐÚNG 1 lần, mirror interceptor axios ở client.ts.
  // Trước đây thiếu nhánh này nên REST tự phục hồi im lặng còn MỌI trang đọc bằng GraphQL chết ngay
  // khi access token hết hạn — kể cả `me`, và `me` chết thì permissions rỗng ⇒ mọi <Can> biến mất
  // (nút Publish/Start/Complete của event không render dù BE vẫn cho phép).
  // Refresh dùng CHUNG mutex single-flight với axios nên nhiều query song song chỉ refresh một lần.
  if (response.status === 401) {
    let fresh: string;
    try {
      fresh = await refreshAccessToken();
    } catch {
      throw new ApiError(401, "Phiên đăng nhập đã hết hạn");
    }
    response = await send(query, variables, fresh);
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
