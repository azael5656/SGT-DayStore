import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as readline from 'readline';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

/**
 * Script de bootstrap del primer superadmin.
 *
 * Uso:
 *   npm run admin:create -- --email=super@daystore.local --password=secret --nombre="Super Admin"
 *   npm run admin:create               (modo interactivo: pide email/password/nombre)
 *
 * Reglas:
 *   - Aborta si ya existe otro superadmin activo (consistencia con la regla
 *     de un único superadmin).
 *   - El password se hashea con bcryptjs (10 rounds) dentro de UsersService.
 *   - Idempotente sobre email: si el email ya existe lo reactiva como
 *     superadmin y reescribe el hash.
 *
 * Solo para entornos locales / primera vez. En producción la creación de
 * usuarios debe ir por el endpoint protegido POST /users.
 */

interface Args {
  email?: string;
  password?: string;
  nombre?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([^=]+)=(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'email' || key === 'password' || key === 'nombre') {
      out[key] = value;
    }
  }
  return out;
}

function ask(prompt: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (hidden) {
    const stdout = process.stdout as NodeJS.WriteStream & { _writeToOutput?: (s: string) => void };
    const original = stdout._writeToOutput?.bind(stdout);
    stdout._writeToOutput = (s: string) => {
      if (original) original(s.includes(prompt) ? s : '');
    };
  }
  return new Promise((resolve) => {
    rl.question(prompt, (ans) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(ans.trim());
    });
  });
}

async function main() {
  const log = new Logger('CreateAdmin');
  const args = parseArgs(process.argv);

  const email = args.email || (await ask('Email del superadmin: '));
  if (!email) throw new Error('Email obligatorio');

  const password = args.password || (await ask('Password: ', true));
  if (!password || password.length < 6) {
    throw new Error('Password debe tener al menos 6 caracteres');
  }

  const nombre = args.nombre || (await ask('Nombre [Super Admin]: ')) || 'Super Admin';

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const users = app.get(UsersService);

    const yaActivo = await users.contarActivosPorRol('superadmin');
    const existente = await users.findByEmail(email);

    if (yaActivo >= 1 && (!existente || existente.role !== 'superadmin')) {
      throw new Error(
        'Ya existe un superadmin activo. Desactívalo o usa admin:delete antes de crear otro.',
      );
    }

    const u = await users.upsertByEmail({ email, password, nombre, role: 'superadmin' });
    log.log(`✔ Superadmin listo: ${u.email} (id ${u.id})`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('admin:create falló:', err.message);
  process.exit(1);
});
