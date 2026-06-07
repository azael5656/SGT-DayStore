import { defineConfig, devices } from '@playwright/test';

/**
 * E2E del panel web. Requiere el stack arriba (npm run docker:up:dev desde
 * proyecto/) + datos demo sembrados (npm run docker:seed).
 *
 * baseURL apunta al Vite dev server (:5173), que proxya /api y /socket.io al
 * gateway nginx. Si Vite ya corre (Docker o local) Playwright lo reusa; si no,
 * lo arranca con `npm run dev`.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  // Los tests comparten estado global (config de tienda en Mongo + alertas en
  // memoria del backend), asi que corren en serie con un solo worker.
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
