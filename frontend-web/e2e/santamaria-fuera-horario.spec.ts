import { test, expect } from '@playwright/test';
import { abrirTienda, cerrarTienda, escenario, login } from './helpers';

/**
 * Flujo "santa maria (MC-38) abierta fuera de horario".
 *
 * Comparten estado global del backend (config de tienda + alertas), por eso
 * corren en serie. Cada test parte de un estado limpio: escenario 'normal'
 * (limpia alertas + puerta cerrada) y login.
 */
test.describe.configure({ mode: 'serial' });

const MENSAJE = 'Santa maria abierta fuera de horario';
const TILE_PUERTA = 'div.border-l-4:has-text("Puerta")';
const cardAlerta = (page: import('@playwright/test').Page) =>
  page.locator('div.border-l-4').filter({ hasText: MENSAJE });

test.beforeEach(async ({ page, request }) => {
  await escenario(request, 'normal'); // limpia alertas y deja la puerta cerrada
  await login(page);
});

test('tienda cerrada + puerta abierta -> alerta alta', async ({
  page,
  request,
}) => {
  await cerrarTienda(page);
  await escenario(request, 'santamaria_abierta');

  // El dashboard refleja la puerta abierta.
  await page.goto('/dashboard-detalle');
  await expect(page.locator(TILE_PUERTA)).toContainText('Abierta');

  // La alerta dedicada aparece en Alertas.
  await page.goto('/alertas');
  const card = cardAlerta(page);
  await expect(card).toBeVisible();
  await expect(card).toContainText('Santa maria fuera de horario'); // labelTipoAlerta
  await expect(card).toContainText('alta'); // severidad
  await expect(card.getByRole('button', { name: 'Reconocer' })).toBeVisible();

  // Snapshot accesible de la fila del badge (severidad + tipo), acotado para
  // excluir la fecha dinamica. Regenerar con: npx playwright test --update-snapshots
  await expect(card.locator('.flex.items-center').first()).toMatchAriaSnapshot(`
    - text: alta Santa maria fuera de horario
  `);
});

test('cierre de puerta -> alerta auto-resuelta y dashboard "Cerrada"', async ({
  page,
  request,
}) => {
  await cerrarTienda(page);
  await escenario(request, 'santamaria_abierta');
  await page.goto('/alertas');
  await expect(cardAlerta(page)).toBeVisible();

  // Cerrar la santa maria: la alerta se auto-resuelve (reconocida por sistema).
  await escenario(request, 'santamaria_cerrada');
  const card = cardAlerta(page);
  await expect(card.getByText('✓ reconocida')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Reconocer' })).toHaveCount(0);

  // El dashboard vuelve a "Cerrada".
  await page.goto('/dashboard-detalle');
  await expect(page.locator(TILE_PUERTA)).toContainText('Cerrada');
});

test('tienda abierta + puerta abierta -> NO genera alerta', async ({
  page,
  request,
}) => {
  await abrirTienda(page);
  await escenario(request, 'santamaria_abierta');

  await page.goto('/alertas');
  await expect(page.getByText(MENSAJE)).toHaveCount(0);

  // Limpieza para no dejar la puerta abierta al siguiente run.
  await escenario(request, 'santamaria_cerrada');
});
