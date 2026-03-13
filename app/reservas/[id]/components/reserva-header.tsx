'use client';

import { Calendar, Clock, User, Package, Pencil, Home, DoorOpen, UserCheck } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import type { ReservaDetalle } from '@/lib/services/reserva-detalle.service';

const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return value;
};

const getStatusBadge = (reserva: ReservaDetalle) => {
  const estado = (reserva.estado ?? '').toLowerCase();
  const tipoCompra = (reserva.tipoCompra ?? '').toLowerCase();
  const precio = (reserva as { precio?: Record<string, unknown> | null })?.precio ?? null;
  const anticipoRaw = (precio as Record<string, unknown> | null)?.Anticipo as Record<string, unknown> | undefined;
  const anticipoValue = anticipoRaw ? (anticipoRaw.Precio ?? anticipoRaw.price) : null;
  const isFlexibleNoAnticipo =
    String(reserva.pack?.Categoria ?? '').toLowerCase() === 'flexible' &&
    !(anticipoValue != null && Number(anticipoValue) > 0);
  const fechaLimitePago = reserva.fechaLimitePago || '';
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const limiteDate = fechaLimitePago ? new Date(fechaLimitePago) : null;
  const isLimiteConcluido =
    limiteDate && !Number.isNaN(limiteDate.getTime()) ? limiteDate < todayMidnight : false;

  if (estado === 'pendiente') {
    return {
      label: 'Consulta de disponibilidad',
      className: 'border-[rgba(13,129,221,0.25)] bg-[rgba(13,129,221,0.12)] text-[#0D81DD]',
    };
  }
  if (estado === 'pendientegestion') {
    return {
      label: 'Esperando confirmación',
      className: 'border-[rgba(255,34,192,0.25)] bg-[rgba(255,34,192,0.12)] text-[#FF22C0]',
    };
  }
  if (estado === 'pendientecambio') {
    return {
      label: 'Solicitud de cambio',
      className: 'border-[rgba(255,195,42,0.25)] bg-[rgba(255,195,42,0.12)] text-[#FFC32A]',
    };
  }
  if (estado === 'cambiorechazado') {
    return {
      label: 'Esperando reconfirmación',
      className: 'border-[rgba(255,195,42,0.25)] bg-[rgba(255,195,42,0.12)] text-[#FFC32A]',
    };
  }
  if (estado === 'pendienteasistentes') {
    return {
      label: 'Pendiente de asistentes',
      className: 'border-[rgba(255,154,25,0.25)] bg-[rgba(255,154,25,0.12)] text-[#FF9A19]',
    };
  }
  if (estado === 'aceptado' && !reserva.pagado) {
    return {
      label: 'Confirmada · Pendiente de pago',
      className: 'border-[rgba(255,154,25,0.25)] bg-[rgba(255,154,25,0.12)] text-[#FF9A19]',
    };
  }
  if (estado === 'aceptado' && reserva.pagado) {
    if (tipoCompra === 'entradas') {
      return {
        label: isLimiteConcluido
          ? 'Confirmada · Periodo de pago concluido'
          : 'Confirmada · En periodo de pago',
        className: isLimiteConcluido
          ? 'border-[rgba(57,157,89,0.25)] bg-[rgba(57,157,89,0.12)] text-[#399D59]'
          : 'border-[rgba(255,154,25,0.25)] bg-[rgba(255,154,25,0.12)] text-[#FF9A19]',
      };
    }
    if (isFlexibleNoAnticipo) {
      return { label: 'Confirmada', className: 'border-[rgba(57,157,89,0.25)] bg-[rgba(57,157,89,0.12)] text-[#399D59]' };
    }
    return { label: 'Confirmada · Pagada', className: 'border-[rgba(57,157,89,0.25)] bg-[rgba(57,157,89,0.12)] text-[#399D59]' };
  }
  if (estado === 'completado') {
    return {
      label: 'Completada',
      className: 'border-[rgba(116,114,253,0.25)] bg-[rgba(116,114,253,0.12)] text-[#7472FD]',
    };
  }
  if (estado === 'expirado') {
    return { label: 'Expirada', className: 'border-[rgba(0,0,0,0.25)] bg-[rgba(0,0,0,0.08)] text-[#000000]' };
  }
  if (estado === 'fallado') {
    return {
      label: 'Fallada',
      className: 'border-[rgba(186,3,29,0.25)] bg-[rgba(186,3,29,0.12)] text-[#BA031D]',
    };
  }
  if (estado === 'no_gestionado') {
    return { label: 'No gestionada', className: 'border-slate-200 bg-slate-100 text-slate-700' };
  }
  if (estado === 'sin_local') {
    return {
      label: 'Sin local asignado',
      className: 'border-[rgba(116,114,253,0.25)] bg-[rgba(116,114,253,0.12)] text-[#7472FD]',
    };
  }

  return { label: reserva.estado ?? 'Sin estado', className: 'border-slate-200 bg-slate-100 text-slate-700' };
};

export function ReservaHeader({
  reserva,
  showClienteContact = true,
  onChangeLocal,
  onChangeEspacio,
  onEditEvento,
  originBadge,
}: {
  reserva: ReservaDetalle;
  showClienteContact?: boolean;
  onChangeLocal?: () => void;
  onChangeEspacio?: () => void;
  onEditEvento?: () => void;
  originBadge?: { label: string; className: string; style?: CSSProperties };
}) {
  const estadoBadge = getStatusBadge(reserva);
  const originFallback =
    typeof reserva.leadKomvo === 'boolean'
      ? reserva.leadKomvo
        ? 'Reserva de Komvo'
        : 'Reserva del restaurante'
      : 'Reserva de Komvo';
  const originPayload = originBadge ?? {
    label: originFallback,
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  const horaInicio = reserva.kombo?.Hora || '--:--';
  const horaFin = reserva.kombo?.horaFin || '';
  const fecha = reserva.kombo?.Fecha || '';
  const responsableNombre =
    (reserva as { responsableEquipo?: { nombre?: string } | null })?.responsableEquipo?.nombre || '';
  const komboRecord = reserva.kombo as Record<string, unknown> | undefined;
  const reservaRecord = reserva as Record<string, unknown>;
  const groupSizeCandidates = [
    'Tamaño del grupo',
    'Tamaño del grupo ',
    'Tamaño del grupo  ',
    'Tamaño del grupo:',
    'Tamaño del grupo :',
    'Tamaño del grupo  :',
    'Tamaño del grupo ',
  ];
  const groupSize =
    groupSizeCandidates
      .map((key) => komboRecord?.[key] as Record<string, unknown> | undefined)
      .concat(
        groupSizeCandidates.map((key) => reservaRecord?.[key] as Record<string, unknown> | undefined)
      )
      .find(Boolean) ?? undefined;
  const aforoMin =
    (groupSize?.min as string | number | null | undefined) ??
    (groupSize?.Min as string | number | null | undefined) ??
    (groupSize?.minimo as string | number | null | undefined) ??
    (groupSize?.Minimo as string | number | null | undefined);
  const aforoMax =
    (groupSize?.max as string | number | null | undefined) ??
    (groupSize?.Max as string | number | null | undefined) ??
    (groupSize?.maximo as string | number | null | undefined) ??
    (groupSize?.Maximo as string | number | null | undefined);

  const toPaxValue = (value?: string | number | null) => {
    if (value == null) return null;
    const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
    if (normalized === '') return null;
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? String(value) : String(parsed);
  };

  const formatRange = (min?: string | number | null, max?: string | number | null) => {
    const minValue = toPaxValue(min);
    const maxValue = toPaxValue(max);
    if (minValue && maxValue) return `${minValue} - ${maxValue} pax`;
    if (minValue) return `${minValue} pax`;
    if (maxValue) return `${maxValue} pax`;
    return '—';
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reserva</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {reserva.usuario?.['Nombre de usuario'] || 'Cliente sin nombre'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${estadoBadge.className}`}>
              {estadoBadge.label}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${originPayload.className}`}
              style={originPayload.style}
            >
              {originPayload.label}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(fecha)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              {horaInicio}
              {horaFin && horaFin !== horaInicio ? ` - ${horaFin}` : ''}
            </span>
            <span className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Aforo solicitado: {formatRange(aforoMin, aforoMax)}
            </span>
            <span className="flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5" />
              {responsableNombre ? `Responsable: ${responsableNombre}` : 'Equipo sin asignar'}
            </span>
          </div>
          {onEditEvento && (
            <div className="flex w-full justify-end sm:w-auto sm:ml-auto">
              <Button
                type="button"
                onClick={onEditEvento}
                variant="outline"
                size="sm"
                className="gap-2 border-slate-200 text-slate-900 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Editar reserva
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Local</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-lg font-semibold text-slate-900">
              {reserva.restaurante?.['Nombre del restaurante'] || 'Restaurante'}
            </p>
            <Button
              type="button"
              onClick={onChangeLocal}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Cambiar local
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Espacio</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {(reserva.sala as { nombre?: string } | null | undefined)?.nombre || 'Sin sala asignada'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Aforo:{' '}
                {((reserva.sala as { aforoMinimo?: number | null } | null | undefined)?.aforoMinimo ?? null) !== null
                  ? (reserva.sala as { aforoMinimo?: number | null } | null | undefined)?.aforoMinimo
                  : '—'}{' '}
                -{' '}
                {((reserva.sala as { aforoMaximo?: number | null } | null | undefined)?.aforoMaximo ?? null) !== null
                  ? (reserva.sala as { aforoMaximo?: number | null } | null | undefined)?.aforoMaximo
                  : '—'}
                {' '}pax
              </p>
            </div>
            <Button
              type="button"
              onClick={onChangeEspacio}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <DoorOpen className="h-4 w-4" />
              Cambiar espacio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
