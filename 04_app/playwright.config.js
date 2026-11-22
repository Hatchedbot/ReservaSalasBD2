// Pruebas de extremo a extremo (E2E) de la aplicación web con Playwright.
// Usan el Microsoft Edge instalado en el equipo (channel: 'msedge'),
// así no hace falta descargar navegadores.
// Requisito: Oracle encendido con el esquema LM_RESERVASALAS instalado.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  // Las pruebas escriben en la misma base de datos: se ejecutan una a la vez
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'msedge',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1366, height: 900 } },
      testIgnore: /movil\.spec\.js/,
    },
    {
      name: 'movil',
      use: { channel: 'msedge', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
      testMatch: /movil\.spec\.js/,
    },
  ],
  webServer: {
    command: 'node src/server.js',
    url: 'http://localhost:3000/api/meta',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
