// frontend/src/lib/fetchWithAuth.ts
import { auth } from '../firebase-client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!API_BASE) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
}

export async function fetchWithAuth(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  const token = await user.getIdToken();

  // Build full URL if path is relative
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const headers = new Headers(init.headers as HeadersInit);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, {
    ...init,
    headers,
  });
}