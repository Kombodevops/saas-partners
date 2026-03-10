'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/auth.service';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      setIsChecking(false);
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  if (!isChecking) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-sm text-slate-500">Cargando...</div>
    </div>
  );
}
