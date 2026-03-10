'use client';

import { ReservaDetalleContent } from '@/components/reservations/reserva-detalle-content';
import { useParams } from 'next/navigation';

export default function DashboardReservaDetallePage() {
  const params = useParams<{ id: string }>();
  const reservaId = params?.id ?? '';
  return <ReservaDetalleContent reservaId={reservaId} variant="page" />;
}
