import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd()) },
    extensions: [".ts", ".tsx", ".mts", ".js", ".mjs", ".jsx", ".json"],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
