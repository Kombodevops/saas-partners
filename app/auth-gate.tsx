'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/auth.service';

const PUBLIC_ROUTES = ['/login', '/register', '/sso'];

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const [hasUser, setHasUser] = useState(() => !!AuthService.getCurrentUser());

  useEffect(() => {
    if (isPublicRoute) return;

    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/login');
      }
      setHasUser(!!user);
    });

    return () => unsubscribe();
  }, [isPublicRoute, router]);

  if (!isPublicRoute && !hasUser) {
    return null;
  }

  return <>{children}</>;
}
