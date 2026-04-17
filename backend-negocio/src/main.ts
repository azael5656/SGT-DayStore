import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Punto de entrada del microservicio de negocio.
 * Configura prefijo global, pipe de validacion y levanta el servidor.
 */
async function bootstrap() {
  const logger = new Logger('BackendNegocio');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/negocio');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const port = process.env.NEGOCIO_PORT || 3001;
  await app.listen(port);
  logger.log(`Backend Negocio ejecutandose en puerto ${port}`);
}

bootstrap();
