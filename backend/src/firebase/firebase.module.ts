import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: (cfg: ConfigService) => {
        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId: cfg.get('FIREBASE_PROJECT_ID'),
            clientEmail: cfg.get('FIREBASE_CLIENT_EMAIL'),
            privateKey: cfg
              .get<string>('FIREBASE_PRIVATE_KEY')
              ?.replace(/\\n/g, '\n'),
          }),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule {}
