'use client';

import { AlertCircle, Calendar, Clock, Copy, Mail, Pencil, Phone, Send, User } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  onEditEvento,
  originBadge,
  clienteEmail,
  clienteTelefono,
  manageUrl,
  onSendEmail,
  sendingEmail,
}: {
  reserva: ReservaDetalle;
  onEditEvento?: () => void;
  originBadge?: { label: string; className: string; style?: CSSProperties };
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  manageUrl?: string | null;
  onSendEmail?: () => void;
  sendingEmail?: boolean;
}) {
  const [copied, setCopied] = useState(false);
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
  const komboRecord = reserva.kombo as Record<string, unknown> | undefined;
  const komboDescripcionRaw =
    (komboRecord?.['Descripción'] as unknown) ??
    (komboRecord?.Descripción as unknown) ??
    (komboRecord?.['Descripcion'] as unknown) ??
    (komboRecord?.Descripcion as unknown);
  const komboDescripcion =
    typeof komboDescripcionRaw === 'string' && komboDescripcionRaw.trim() ? komboDescripcionRaw.trim() : null;
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
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-none bg-white p-4 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reserva</p>
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${estadoBadge.className}`}>
                {estadoBadge.label}
              </span>
              {onEditEvento ? (
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
              ) : null}
            </div>
          </div>

          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {reserva.usuario?.['Nombre de usuario'] || 'Cliente sin nombre'}
          </h1>

	          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
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
	          </div>
	          {komboDescripcion ? (
	            <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
	              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
	              <div className="min-w-0">
	                <span className="font-medium text-slate-500">Info adicional:</span>{' '}
	                <span className="break-words">{komboDescripcion}</span>{' '}
	                <button
	                  type="button"
	                  className="ml-2 inline-flex shrink-0 items-center font-semibold text-[#7472FD] hover:text-[#5f5bf2]"
	                  onClick={() => window.dispatchEvent(new CustomEvent('komvo:open-chat'))}
	                >
	                  Responder
	                </button>
	              </div>
	            </div>
	          ) : null}
	        </CardContent>
	      </Card>

      <Card className="border-none bg-white p-4 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cliente</p>
            {manageUrl ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSendEmail}
                  className="h-7 gap-2 px-3"
                  disabled={!clienteEmail || !onSendEmail || sendingEmail}
                >
                  <Send className="h-4 w-4" />
                  {sendingEmail ? 'Enviando...' : clienteEmail ? 'Enviar recordatorio' : 'Email no disponible'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-2 px-3"
                  disabled={!manageUrl}
                  onClick={async () => {
                    if (!manageUrl) return;
                    try {
                      await navigator.clipboard.writeText(manageUrl);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    } catch {
                      setCopied(false);
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copiado' : 'Copiar enlace'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {clienteEmail ? (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="truncate">{clienteEmail}</span>
              </div>
            ) : null}
            {clienteTelefono ? (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="truncate">{clienteTelefono}</span>
              </div>
            ) : null}
            {manageUrl ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Enlace para el cliente
                </p>
                <p className="mt-1 break-all text-xs text-slate-600">{manageUrl}</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
