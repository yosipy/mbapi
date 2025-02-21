import * as path from "path";
import { defineWorkersProject } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersProject(() => {
  return {
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    test: {
      globals: true,
      poolOptions: {
        workers: { wrangler: { configPath: "./wrangler.jsonc" } },
      },
    },
  };
});
