import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    env: {
      DATABASE_URL:
        "postgresql://test:test@localhost:5432/test?sslmode=require",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test",
      CLERK_SECRET_KEY: "sk_test",
      EMBEDDING_DIMENSIONS: "768",
    },
  },
});
