import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

/**
 * Seed idempotente de las 3 cuentas demo.
 * Ejecuta con:
 *   docker compose exec backend-negocio npm run seed:users
 * Asume TYPEORM_SYNC=true en .env (o que la tabla users ya exista).
 */
async function seed() {
  const log = new Logger('SeedUsers');
  const app = await NestFactory.createApplicationContext(AppModule);
  const users = app.get(UsersService);

  const cuentas = [
    {
      email: 'super@daystore.local',
      password: 'super1234',
      nombre: 'Super Admin',
      role: 'superadmin' as const,
    },
    {
      email: 'owner@daystore.local',
      password: '123456',
      nombre: 'Dueno DayStore',
      role: 'admin' as const,
    },
    {
      email: 'vendedor@daystore.local',
      password: '123456',
      nombre: 'Vendedor Demo',
      role: 'vendedor' as const,
    },
  ];

  for (const c of cuentas) {
    const u = await users.upsertByEmail(c);
    log.log(`✔ ${u.role.padEnd(10)} ${u.email}`);
  }

  log.log(`Seed completado: ${cuentas.length} usuarios listos.`);
  await app.close();
}

seed().catch((err) => {
  console.error('Seed fallo:', err);
  process.exit(1);
});
