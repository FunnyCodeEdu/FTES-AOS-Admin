import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// jsdom: module chain (auth store) chạm localStorage/sessionStorage khi import.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Exercise the real fullscreen scroll rule instead of Vitest's empty CSS stub.
    css: { include: [/MarkdownEditor\.css/] },
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
