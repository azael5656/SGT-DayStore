import { APIRequestContext, Page, expect } from '@playwright/test';

/** Cuenta demo admin (ver README / docker:seed). */
export const OWNER = { email: 'owner@daystore.local', password: '123456' };

/** Login real por la UI: llena credenciales y espera el panel logueado. */
export async function login(
  page: Page,
  email = OWNER.email,
  password = OWNER.password,
): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  // El boton "Cerrar sesion" del header solo existe con sesion iniciada.
  await expect(page.getByRole('button', { name: /Cerrar sesion/ })).toBeVisible();
}

/** Dispara un escenario del simulador (endpoint @Public, sin token). */
export async function escenario(
  request: APIRequestContext,
  nombre: string,
): Promise<void> {
  const res = await request.post(`/api/iot/simulator/escenario/${nombre}`);
  expect(res.ok(), `escenario ${nombre} -> ${res.status()}`).toBeTruthy();
}

/** Fuerza la tienda CERRADA (modo nocturno) desde la pagina de Horario. */
export async function cerrarTienda(page: Page): Promise<void> {
  await page.goto('/horario-tienda');
  await page.getByRole('button', { name: /Cerrar ahora/ }).click();
  await expect(page.getByText('Tienda CERRADA')).toBeVisible();
}

/** Fuerza la tienda ABIERTA ("Abrir ahora") desde la pagina de Horario. */
export async function abrirTienda(page: Page): Promise<void> {
  await page.goto('/horario-tienda');
  await page.getByRole('button', { name: /Abrir ahora/ }).click();
  await expect(page.getByText('Tienda ABIERTA')).toBeVisible();
}
