'use client';

import { useAuth } from '../app/context/AuthContext';

export function LogoutButton() {
  const { logout, user } = useAuth();
  if (!user) return null;

  return (
    <button onClick={logout} style={{ padding: '0.5rem 1rem' }}>
      Sign Out
    </button>
  );
}