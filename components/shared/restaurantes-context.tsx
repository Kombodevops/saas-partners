'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { RestauranteResumen } from '@/lib/types/restaurante';
import { AuthService } from '@/lib/services/auth.service';
import { RestaurantesService } from '@/lib/services/restaurantes.service';

interface RestaurantesContextValue {
  restaurantes: RestauranteResumen[];
  isLoading: boolean;
  refresh: (options?: { force?: boolean }) => Promise<void>;
}

const CACHE_KEY = 'komvo_restaurantes_cache';
const PUBLIC_ROUTES = ['/login', '/register'];

const RestaurantesContext = createContext<RestaurantesContextValue | null>(null);

export function RestaurantesProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [restaurantes, setRestaurantes] = useState<RestauranteResumen[]>(() => {
    if (typeof window === 'undefined') return [];
    const cachedRaw = sessionStorage.getItem(CACHE_KEY);
    if (!cachedRaw) return [];
    try {
      const cached = JSON.parse(cachedRaw) as { userId: string; restaurantes: RestauranteResumen[] };
      return cached.restaurantes ?? [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !sessionStorage.getItem(CACHE_KEY);
  });

  const loadRestaurantes = useCallback(
    async (options?: { force?: boolean }) => {
      if (PUBLIC_ROUTES.includes(pathname)) {
        setIsLoading(false);
        return;
      }

      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        setRestaurantes([]);
        setIsLoading(false);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(CACHE_KEY);
        }
        return;
      }

      const ownerId = (await AuthService.getCurrentPartnerId()) ?? currentUser.uid;

      if (typeof window !== 'undefined' && !options?.force) {
        const cachedRaw = sessionStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw) as { userId: string; restaurantes: RestauranteResumen[] };
            if (cached.userId === ownerId) {
              setRestaurantes(cached.restaurantes ?? []);
              setIsLoading(false);
              return;
            }
          } catch {
            // ignore cache errors
          }
        }
      }

      setIsLoading(true);
      try {
        const restaurantesData = await RestaurantesService.getRestaurantesByOwnerId(ownerId);
        setRestaurantes(restaurantesData);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ userId: ownerId, restaurantes: restaurantesData })
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [pathname]
  );

  useEffect(() => {
    if (PUBLIC_ROUTES.includes(pathname)) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (!active) return;
      if (!user) {
        setRestaurantes([]);
        setIsLoading(false);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(CACHE_KEY);
        }
        return;
      }
      loadRestaurantes();
    });

    loadRestaurantes();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadRestaurantes, pathname]);

  const value = useMemo<RestaurantesContextValue>(
    () => ({ restaurantes, isLoading, refresh: loadRestaurantes }),
    [restaurantes, isLoading, loadRestaurantes]
  );

  return <RestaurantesContext.Provider value={value}>{children}</RestaurantesContext.Provider>;
}

export function useRestaurantes() {
  const ctx = useContext(RestaurantesContext);
  if (!ctx) {
    throw new Error('useRestaurantes must be used within RestaurantesProvider');
  }
  return ctx;
}
