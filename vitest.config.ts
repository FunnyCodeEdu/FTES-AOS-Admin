import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// jsdom: module chain (auth store) chạm localStorage/sessionStorage khi import.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
