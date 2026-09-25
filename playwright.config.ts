import { defineConfig, devices } from '@playwright/test';

// The "Desktop Chrome" profile claims to be Windows. The app picks Ctrl or ⌘ from the reported
// platform while the tests pick it from the host OS, so keep the browser's real user agent.
const { userAgent: _windowsUserAgent, ...desktopChrome } = devices['Desktop Chrome'];

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    acceptDownloads: true,
    launchOptions: process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_BROWSERS_PATH ? { executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' } : {},
  },
  projects: [
    { name: 'chromium', testIgnore: /mobile\.spec\.ts/, use: { ...desktopChrome, viewport: { width: 1440, height: 900 } } },
    // iPhone 17 Pro-sized viewport (402 × 874 CSS px) with touch input, rendered by Chromium.
    {
      name: 'phone',
      testMatch: /mobile\.spec\.ts/,
      use: { ...desktopChrome, viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
