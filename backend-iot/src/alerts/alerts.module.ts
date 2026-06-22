import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SimulatorModule } from '../simulator/simulator.module';
import { AlertsController } from './alerts.controller';
import { AlertsRepository } from './alerts.repository';
import { AlertsService } from './alerts.service';
import { Alert, AlertSchema } from './schemas/alert.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }]),
    SimulatorModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsRepository],
  exports: [AlertsService],
})
export class AlertsModule {}
