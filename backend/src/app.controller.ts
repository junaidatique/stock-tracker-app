import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import type { App } from 'firebase-admin/app';
import type * as admin from 'firebase-admin';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('FIREBASE_ADMIN')
    private readonly firebaseApp: App & admin.app.App,
  ) {}

  @Get()
  health(): string {
    return this.appService.health();
  }
}
