'use client';

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProtectedPage() {
  const { user, loading, ...rest } = useAuth();
  console.log("🚀 ~ page.tsx:9 ~ ProtectedPage ~ user:", user)
  console.log("🚀 ~ page.tsx:10 ~ ProtectedPage ~ loading:", loading)
  console.log("🚀 ~ page.tsx:11 ~ ProtectedPage ~ rest:", rest)
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading || !user) return <p>Loading…</p>;
  return <p>Welcome, {user.email}!</p>;
}