// backend/src/thresholds/thresholds.service.ts
import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateThresholdDto } from './dto/create-threshold.dto';

export interface Threshold {
  id: string;
  ticker: string;
  target: number;
  condition: 'above' | 'below';
  enabled: boolean;
  createdAt: admin.firestore.Timestamp;
}

@Injectable()
export class ThresholdsService {
  private db: admin.firestore.Firestore;

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App,
  ) {
    this.db = this.firebaseApp.firestore();
  }

  private userCollection(uid: string) {
    return this.db.collection('users').doc(uid).collection('thresholds');
  }
  async create(uid: string, dto: CreateThresholdDto): Promise<Threshold> {
    const data: Omit<Threshold, 'id' | 'createdAt'> & {
      createdAt: admin.firestore.FieldValue;
    } = {
      ticker: dto.ticker,
      target: dto.target,
      condition: dto.condition,
      enabled: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await this.userCollection(uid).add(data);
    const snap = await ref.get();
    return { id: ref.id, ...(snap.data() as Omit<Threshold, 'id'>) };
  }

  async findAll(uid: string): Promise<Threshold[]> {
    const snaps = await this.userCollection(uid)
      .orderBy('createdAt', 'desc')
      .get();
    return snaps.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Threshold, 'id'>),
    }));
  }

  async remove(uid: string, id: string): Promise<void> {
    await this.userCollection(uid).doc(id).delete();
  }
  /** Disable (mark as sent) so it no longer appears or fires again */
  async disable(uid: string, id: string): Promise<void> {
    await this.userCollection(uid).doc(id).update({ enabled: false });
  }
}
