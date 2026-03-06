// https://github.com/vercel/next.js/blob/canary/examples/with-vitest/vitest.config.ts
// 위 링크에서 복붙한 config입니다. 굳이 alias와 plugins 옵션은 필수가 아닙니다.

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
