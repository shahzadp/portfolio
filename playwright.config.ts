import { defineConfig, devices } from "@playwright/test";

/**
 * Tests run against the *production* export (`out/`), not the dev server, so
 * they exercise the exact artefact that gets deployed.
 */
export const PORT = 4321;
const baseURL = `http://127.0.0.1:${PORT}`;

/** Device matrix — desktop plus two real phone profiles with touch. */
export const PROJECTS = {
  "desktop-chrome": {
    name: "desktop-chrome",
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: 1440, height: 900 },
    },
  },
  "desktop-wide": {
    name: "desktop-wide",
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: 1920, height: 1080 },
    },
  },
  "tablet-chrome": {
    name: "tablet-chrome",
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: 820, height: 1180 },
      hasTouch: true,
    },
  },
  "phone-chrome": {
    name: "phone-chrome",
    use: {
      ...devices["Pixel 7"],
    },
  },
  "phone-webkit": {
    name: "phone-webkit",
    use: {
      ...devices["iPhone 13"],
    },
  },
} as const;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    PROJECTS["desktop-chrome"],
    PROJECTS["desktop-wide"],
    PROJECTS["tablet-chrome"],
    PROJECTS["phone-chrome"],
    PROJECTS["phone-webkit"],
  ],

  webServer: {
    command: "npm run build && node scripts/preview.mjs --port=4321",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});