'use client';

import { createContext, useContext } from 'react';
import type { Partner } from '@/lib/types/partner';
import type { RestauranteResumen } from '@/lib/types/restaurante';
import type { PackResumen } from '@/lib/types/pack';

interface DashboardDataContextValue {
  partner: Partner | null;
  restaurantes: RestauranteResumen[];
  packs: PackResumen[];
  isLoading: boolean;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function DashboardDataProvider({
  value,
  children,
}: {
  value: DashboardDataContextValue;
  children: React.ReactNode;
}) {
  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardData must be used within DashboardDataProvider');
  }
  return ctx;
}
