import { defineConfig, devices } from '@playwright/test';

// Testy E2E klikają przez apkę jak prawdziwy użytkownik — na desktopie i na
// telefonie. Serwer (serve.js) startuje sam, brama hasła na localhoście jest
// wyłączona, więc testy wchodzą prosto do apki.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 6_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node serve.js',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
