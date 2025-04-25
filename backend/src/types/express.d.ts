import type { auth } from 'firebase-admin';

declare global {
  namespace Express {
    interface Request {
      /** Populated by FirebaseAuthGuard */
      user?: auth.DecodedIdToken;
    }
  }
}
