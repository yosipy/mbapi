import * as path from "path"
import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config"

export default defineWorkersProject(async () => {
  const migrationsPath = path.join(__dirname, "migrations")
  const migrations = await readD1Migrations(migrationsPath)

  return {
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    test: {
      globals: true,
      setupFiles: ["./src/test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          miniflare: {
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  }
})
