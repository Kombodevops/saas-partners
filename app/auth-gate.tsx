'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/auth.service';

const PUBLIC_ROUTES = ['/login', '/register'];

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasUser, setHasUser] = useState(() => !!AuthService.getCurrentUser());
  const [checking, setChecking] = useState(() => {
    if (PUBLIC_ROUTES.includes(pathname)) return false;
    return !AuthService.getCurrentUser();
  });

  useEffect(() => {
    if (PUBLIC_ROUTES.includes(pathname)) {
      setChecking(false);
      return;
    }

    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setHasUser(true);
      setChecking(false);
    }

    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
      setHasUser(!!user);
      setChecking(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (checking && !PUBLIC_ROUTES.includes(pathname) && !hasUser) {
    return null;
  }

  return <>{children}</>;
}
