import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { IndicesModule } from './indices/indices.module';
import { ThresholdsModule } from './thresholds/thresholds.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    FirebaseModule,
    IndicesModule,
    ThresholdsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
