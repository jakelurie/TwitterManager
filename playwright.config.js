import { defineConfig } from "@playwright/test";
process.env.PLAYWRIGHT_BROWSERS_PATH = "0";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4332" },
  webServer: {
    command:
      "DATA_DIR=data/test-browser PORT=4332 DISABLE_WORKERS=1 node server/index.js",
    url: "http://127.0.0.1:4332/api/state",
    reuseExistingServer: false,
  },
  reporter: "list",
});
