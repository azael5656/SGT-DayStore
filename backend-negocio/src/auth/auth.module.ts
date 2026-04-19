import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

/**
 * Modulo de autenticacion.
 * Registra la entidad User en TypeORM y expone el AuthService para que
 * otros modulos puedan reutilizarlo si lo necesitan.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
