'use client';

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProtectedPage() {
  const { user, loading } = useAuth();
  console.log("🚀 ~ page.tsx:9 ~ ProtectedPage ~ user:", user)
  console.log("🚀 ~ page.tsx:10 ~ ProtectedPage ~ loading:", loading)
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading]);

  if (loading || !user) return <p>Loading…</p>;
  return <p>Welcome, {user.email}!</p>;
}