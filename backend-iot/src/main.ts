import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Punto de entrada del microservicio IoT.
 * Configura prefijo global, pipe de validacion y levanta el servidor.
 */
async function bootstrap() {
  const logger = new Logger('BackendIoT');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/iot');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const port = process.env.IOT_PORT || 3002;
  await app.listen(port);
  logger.log(`Backend IoT ejecutandose en puerto ${port}`);
}

bootstrap();
