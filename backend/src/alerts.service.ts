// backend/src/alerts/alerts.service.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ThresholdsService, Threshold } from './thresholds/thresholds.service';
import { IndicesService } from './indices/indices.service';
import type * as admin from 'firebase-admin';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private firestore: admin.firestore.Firestore;

  constructor(
    private thresholdsSvc: ThresholdsService,
    private indicesSvc: IndicesService,
    @Inject('FIREBASE_ADMIN')
    private firebaseApp: admin.app.App,
  ) {
    this.firestore = this.firebaseApp.firestore();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleThresholds() {
    this.logger.debug('Running threshold checks…');
    // Gather enabled thresholds per user
    const users = await this.thresholdsSvc.listAllUsers();
    for (const { uid, thresholds } of users) {
      for (const th of thresholds) {
        await this.processThreshold(uid, th);
      }
    }
  }

  private async processThreshold(uid: string, th: Threshold) {
    // 1) Fetch the latest price
    const today = new Date().toISOString().slice(0, 10);
    const chart = await this.indicesSvc.getChart(th.ticker, today, '1min');
    const price =
      chart.s === 'ok' && chart.c.length ? chart.c[chart.c.length - 1] : null;
    if (price == null) return;

    // 2) Check breach
    const breached =
      (th.condition === 'above' && price > th.target) ||
      (th.condition === 'below' && price < th.target);
    if (!breached) return;

    try {
      // 3) Get user email
      const userRec = await this.firebaseApp.auth().getUser(uid);
      const email = userRec.email;
      if (!email) throw new Error('No email on user record');

      // 4) Enqueue email for the extension
      await this.firestore.collection('mail').add({
        to: email,
        message: {
          subject: `📈 Alert: ${th.ticker} is ${th.condition} ${th.target}`,
          text: `${th.ticker} is now ${price}, which is ${th.condition} your threshold of ${th.target}.`,
          html: `<p><strong>${th.ticker}</strong> is now <strong>${price}</strong>, which is <strong>${th.condition}</strong> your threshold of <strong>${th.target}</strong>.</p>`,
        },
      });

      this.logger.log(`Enqueued email to ${email} for ${th.ticker}`);

      // 5) Disable threshold so it won’t fire again
      await this.thresholdsSvc.disable(uid, th.id);
    } catch (err: any) {
      this.logger.error(
        `Error processing threshold ${th.id}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }
}
