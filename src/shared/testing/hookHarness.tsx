import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Harness render hook tối giản cho vitest + jsdom (repo KHÔNG có @testing-library):
// mount hook vào 1 component probe qua react-dom/client, bọc QueryClientProvider khi cần.
// Chỉ dùng trong *.test.* — không import từ code sản phẩm.

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/** QueryClient tắt retry để test lỗi không bị treo chờ back-off. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export interface RenderedHook<T> {
  /** Giá trị hook ở lần render MỚI NHẤT. */
  result: { current: T };
  unmount: () => void;
}

export function renderHook<T>(useHook: () => T, client?: QueryClient): RenderedHook<T> {
  const container = document.createElement("div");
  const root = createRoot(container);
  const result = { current: undefined as T };

  function Probe() {
    result.current = useHook();
    return null;
  }

  act(() => {
    root.render(
      client ? (
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>
      ) : (
        <Probe />
      )
    );
  });

  return { result, unmount: () => act(() => root.unmount()) };
}

/** Xả microtask trong act để state async (react-query) kịp cập nhật vào probe. */
export async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

/** Poll assertion tới khi pass hoặc quá timeout (mặc định 2s) — thay cho waitFor của RTL. */
export async function waitFor(assertion: () => void, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      assertion();
      return;
    } catch (err) {
      if (Date.now() - start > timeoutMs) throw err;
      await flush();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }
  }
}
