// E2E config cho admin-lecturer-ai-assist (KHÔNG commit — dev-only, dev server 5173 phải chạy sẵn).
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000, // AI call SSE/job có thể tới 120s
  expect: { timeout: 150_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0, // mỗi ca AI chạy đúng 1 lần (tiêu quota thật)
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
});
