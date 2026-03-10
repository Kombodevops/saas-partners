'use client';

import { useParams } from 'next/navigation';
import { ReservaDetalleContent } from '@/components/reservations/reserva-detalle-content';

export default function ReservaDetallePage() {
  const params = useParams<{ id: string }>();
  const reservaId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  return <ReservaDetalleContent reservaId={reservaId} variant="page" />;
}
