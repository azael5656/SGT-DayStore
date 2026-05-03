import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { User } from '../auth/entities/user.entity';

/**
 * Script de hard-delete de un superadmin por email. Solo para reset de
 * entornos locales (cuando hay que rotar el bootstrap inicial sin pasar
 * por la UI).
 *
 * Uso:
 *   npm run admin:delete -- --email=super@daystore.local
 *
 * Reglas:
 *   - Borra solo si el usuario existe y tiene rol superadmin.
 *   - Para usuarios admin/vendedor: usar el endpoint PATCH /users/:id/desactivar
 *     desde el panel (mantiene la auditoría).
 */

interface Args {
  email?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([^=]+)=(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'email') out.email = value;
  }
  return out;
}

async function main() {
  const log = new Logger('DeleteAdmin');
  const args = parseArgs(process.argv);

  if (!args.email) {
    throw new Error('Falta --email=...');
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const ds = app.get(DataSource);
    const repo = ds.getRepository(User);

    const u = await repo.findOne({ where: { email: args.email.toLowerCase() } });
    if (!u) {
      log.warn(`No existe usuario con email ${args.email}`);
      return;
    }
    if (u.role !== 'superadmin') {
      throw new Error(
        `${args.email} tiene rol ${u.role}. Este script solo borra superadmin. Usa el panel para desactivar admin/vendedor.`,
      );
    }

    await repo.delete({ id: u.id });
    log.log(`✔ Superadmin eliminado: ${u.email} (id ${u.id})`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('admin:delete falló:', err.message);
  process.exit(1);
});
