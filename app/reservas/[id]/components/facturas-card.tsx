'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar, Receipt, Wallet } from 'lucide-react';
import type { FacturaDetalle, AsistenciaDetalle } from '@/lib/services/reserva-detalle.service';
import { AuthService } from '@/lib/services/auth.service';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Props = {
  facturas: FacturaDetalle[];
  facturasAll: FacturaDetalle[];
  leadKomvo: boolean;
  asistentes?: AsistenciaDetalle[];
  servicioPagado?: ServicioPagado | null;
  planLabel?: string;
  planPriceLabel?: string;
  partnerId?: string | null;
  reservaId?: string | null;
  reservaPagado?: boolean;
  reservaEstado?: string | null;
  reservaFechaEvento?: string | Date | TimestampLike | null;
};

type FacturaTipo = 'usuario' | 'partner' | 'restaurante' | 'usuario_comision' | 'unknown';

const toNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);
const toString = (value: unknown) => (typeof value === 'string' ? value : '');

const getFacturaTipo = (factura: FacturaDetalle): FacturaTipo => {
  const raw = factura as Record<string, unknown>;
  const tipo = toString(raw.tipo).toLowerCase();
  if (tipo === 'usuario' || tipo === 'partner' || tipo === 'restaurante' || tipo === 'usuario_comision') return tipo;
  return 'unknown';
};

const getFacturaNumber = (factura: FacturaDetalle) => {
  const raw = factura as Record<string, unknown>;
  return toString(raw.number);
};

const getFacturaUrl = (factura: FacturaDetalle) => {
  const raw = factura as Record<string, unknown>;
  return toString(raw.url);
};

const getFacturaStatusLabel = (factura: FacturaDetalle) => {
  const raw = factura as Record<string, unknown>;
  const refundStatus = toString(raw.refundStatus).toLowerCase();
  if (refundStatus && refundStatus !== 'none') return 'Reembolso';
  if (refundStatus === 'none') return 'Pagada';
  const status = toString(raw.status || raw.estado).toLowerCase();
  if (status === 'paid') return 'Pagada';
  if (status === 'open' || status === 'draft' || status === 'pending') return 'Pendiente';
  if (status === 'void' || status === 'uncollectible' || status === 'canceled') return 'Cancelada';
  return status || 'Pendiente';
};

const getFacturaDate = (factura: FacturaDetalle) => {
  const raw = factura as Record<string, unknown>;
  const createdAt = raw.createdAt as { toDate?: () => Date } | string | undefined;
  if (createdAt && typeof createdAt === 'object' && createdAt.toDate) return createdAt.toDate();
  if (typeof createdAt === 'string') return new Date(createdAt);
  return null;
};

const formatDate = (date: Date | null) => {
  if (!date || Number.isNaN(date.getTime())) return 'Sin fecha';
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${date.getFullYear()}`;
};

type TimestampLike = { toDate?: () => Date; seconds?: number; nanoseconds?: number };

type ServicioPagadoItem = {
  name?: string;
  quantity?: number;
  unit_amount_cents?: number;
  total_cents?: number;
  currency?: string;
};

type ServicioPagado = {
  categoria?: string;
  currency?: string;
  items?: ServicioPagadoItem[];
  total_cents?: number;
  tipoCompra?: string;
};

const formatDateValue = (value?: string | Date | TimestampLike | null) => {
  if (!value) return 'Sin fecha';
  if (value instanceof Date) return formatDate(value);
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Sin fecha' : formatDate(date);
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? 'Sin fecha' : formatDate(date);
    }
    if (typeof value.seconds === 'number') {
      const date = new Date(value.seconds * 1000);
      return Number.isNaN(date.getTime()) ? 'Sin fecha' : formatDate(date);
    }
  }
  return 'Sin fecha';
};

const getAmountCents = (factura: FacturaDetalle) => {
  const raw = factura as Record<string, unknown>;
  return (
    toNumber(raw.totalCents) ??
    toNumber(raw.total_cents) ??
    toNumber(raw.amountPaidCents) ??
    toNumber(raw.amount_paid_cents) ??
    toNumber(raw.subtotalCents) ??
    toNumber(raw.subtotal_cents) ??
    undefined
  );
};

const getAmount = (factura: FacturaDetalle) => {
  if (typeof factura.total === 'number') return factura.total;
  if (typeof factura.importe === 'number') return factura.importe;
  const cents = getAmountCents(factura);
  if (typeof cents === 'number') return cents / 100;
  return 0;
};

const getFacturaComisionNumber = (factura: FacturaDetalle) => {
  const raw = factura as Record<string, unknown>;
  return toString(raw.facturaComisionNumber);
};

const getFacturaUserId = (factura: FacturaDetalle) => {
  const raw = factura as Record<string, unknown>;
  return toString(raw.userId || raw.usuarioId || raw.uid);
};

const getFacturaQuantity = (factura: FacturaDetalle) => {
  const raw = factura as Record<string, unknown>;
  const qty = toNumber(raw.quantity);
  return typeof qty === 'number' ? qty : undefined;
};

const getAsistenteName = (asistente: AsistenciaDetalle) => {
  const raw = asistente as Record<string, unknown>;
  return (
    (raw.nombre as string | undefined) ??
    (raw['Nombre'] as string | undefined) ??
    (raw['Nombre de usuario'] as string | undefined) ??
    ''
  );
};

const getAsistenteUserId = (asistente: AsistenciaDetalle) => {
  const raw = asistente as Record<string, unknown>;
  return toString(raw.userId || raw.usuarioId || raw.uid || raw.id);
};

const formatAmount = (amount: number) => `${amount.toFixed(2)} €`;
const formatAmountCents = (cents?: number) =>
  typeof cents === 'number' && Number.isFinite(cents) ? `${(cents / 100).toFixed(2)} €` : '—';

const computeNetoAmount = (factura: FacturaDetalle, allFacturas: FacturaDetalle[]) => {
  const tipo = getFacturaTipo(factura);
  if (tipo !== 'usuario') return getAmount(factura);
  const comisionNumber = getFacturaComisionNumber(factura);
  if (!comisionNumber) return getAmount(factura);
  const facturaComision = allFacturas.find((item) => getFacturaTipo(item) === 'usuario_comision' && getFacturaNumber(item) === comisionNumber);
  if (!facturaComision) return getAmount(factura);
  return getAmount(factura) - getAmount(facturaComision);
};

const sumAmounts = (items: FacturaDetalle[], allFacturas: FacturaDetalle[], neto: boolean) => {
  return items.reduce((acc, item) => acc + (neto ? computeNetoAmount(item, allFacturas) : getAmount(item)), 0);
};

type PayoutCheckResult = {
  canWithdraw: boolean;
  policyCompliant?: boolean;
  stripeAvailable?: boolean;
  totalEuros?: number;
  availableEuros?: number;
  policyDetails?: {
    daysRemaining?: number;
  };
  alreadyWithdrawn?: boolean;
  existingPayout?: {
    status?: string;
    amountEuros?: number;
    payoutId?: string;
    createdAt?: string | Date | TimestampLike | null;
    arrivalDate?: string | Date | TimestampLike | null;
    processedAt?: string | Date | TimestampLike | null;
    method?: string;
  };
  payoutId?: string;
  status?: string;
  amountEuros?: number;
  createdAt?: string | Date | TimestampLike | null;
  arrivalDate?: string | Date | TimestampLike | null;
  processedAt?: string | Date | TimestampLike | null;
  method?: string;
  error?: string;
};

type PayoutEntry = {
  id: string;
  createdAt?: string | Date | TimestampLike | null;
  amountEuros?: number;
  status?: string;
};

export function FacturasCard({
  facturas,
  facturasAll,
  leadKomvo,
  asistentes,
  planLabel,
  planPriceLabel,
  partnerId,
  reservaId,
  reservaPagado,
  reservaEstado,
  reservaFechaEvento,
  servicioPagado,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkingPayout, setCheckingPayout] = useState(false);
  const [creatingPayout, setCreatingPayout] = useState(false);
  const [payoutInfo, setPayoutInfo] = useState<PayoutCheckResult | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<PayoutEntry[]>([]);

  const facturasUsuarios = useMemo(() => facturas.filter((f) => {
    const tipo = getFacturaTipo(f);
    return tipo === 'usuario' || tipo === 'restaurante' || tipo === 'unknown';
  }), [facturas]);

  const totalUsuarios = useMemo(
    () => sumAmounts(facturasUsuarios, facturasAll, !leadKomvo),
    [facturasUsuarios, facturasAll, leadKomvo]
  );
  const totalComisiones = useMemo(() => {
    if (!leadKomvo) return 0;
    return (
      facturasUsuarios.reduce((acc, factura) => {
        const raw = factura as Record<string, unknown>;
        const cents =
          typeof raw.amount_comision_cents === 'number'
            ? raw.amount_comision_cents
            : typeof raw.amount_comision_cents === 'string'
              ? Number(raw.amount_comision_cents)
              : 0;
        return acc + (Number.isFinite(cents) ? cents : 0);
      }, 0) / 100
    );
  }, [leadKomvo, facturasUsuarios]);

  const list = facturasUsuarios;

  const totalNetoRestaurante = useMemo(
    () => (leadKomvo ? totalUsuarios - totalComisiones : totalUsuarios),
    [leadKomvo, totalUsuarios, totalComisiones]
  );

  const servicioPagadoItems = useMemo(() => {
    return (servicioPagado?.items ?? [])
      .filter((item) => !String(item.name ?? '').toLowerCase().includes('costes de gestión'))
      .map((item) => ({
        name: item.name ?? 'Concepto',
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        unitAmount: typeof item.unit_amount_cents === 'number' ? item.unit_amount_cents : null,
        total: typeof item.total_cents === 'number' ? item.total_cents : null,
        currency: item.currency ?? servicioPagado?.currency ?? 'eur',
      }));
  }, [servicioPagado]);

  const servicioPagadoLabel = useMemo(() => {
    const categoria = (servicioPagado?.categoria ?? '').toLowerCase();
    if (categoria === 'tickets') return 'Tickets';
    if (categoria === 'menú' || categoria === 'menu') return 'Menú';
    if (categoria === 'best deal') return 'Barra libre';
    if (categoria === 'flexible') return 'Anticipo';
    return servicioPagado?.categoria ?? 'Servicio';
  }, [servicioPagado]);

  const servicioPagadoIsPerPerson = useMemo(() => {
    const categoria = (servicioPagado?.categoria ?? '').toLowerCase();
    return categoria === 'menú' || categoria === 'menu' || categoria === 'best deal' || categoria === 'flexible';
  }, [servicioPagado]);

  const totalQuantity = useMemo(() => {
    return facturasUsuarios.reduce((acc, factura) => {
      const qty = getFacturaQuantity(factura);
      return acc + (typeof qty === 'number' ? qty : 0);
    }, 0);
  }, [facturasUsuarios]);
  const asistentesByUserId = useMemo(() => {
    const map = new Map<string, string>();
    (asistentes ?? []).forEach((asistente) => {
      const userId = getAsistenteUserId(asistente);
      const name = getAsistenteName(asistente);
      if (userId && name) {
        map.set(userId, name);
      }
    });
    return map;
  }, [asistentes]);

  const loadLatestPayoutFromFirestore = async () => {
    if (!reservaId) return null;
    try {
      const payoutsRef = collection(db, 'reservas', reservaId, 'payouts');
      const q = query(payoutsRef, orderBy('createdAt', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const payoutDoc = snapshot.docs[0];
      const data = payoutDoc.data() as Record<string, unknown>;
      const existingPayout = {
        payoutId: (data.payoutId as string | undefined) ?? payoutDoc.id,
        status: data.status as string | undefined,
        amountEuros: data.amountEuros as number | undefined,
        createdAt: data.createdAt as string | Date | TimestampLike | null,
        arrivalDate: data.arrivalDate as string | Date | TimestampLike | null,
        processedAt: data.processedAt as string | Date | TimestampLike | null,
        method: data.method as string | undefined,
      };
      return existingPayout;
    } catch (error) {
      console.error('Error leyendo payouts:', error);
      return null;
    }
  };

  const loadPayoutsFromFirestore = async () => {
    if (!reservaId) return;
    try {
      const payoutsRef = collection(db, 'reservas', reservaId, 'payouts');
      const snap = await getDocs(query(payoutsRef, orderBy('createdAt', 'desc')));
      const rows = snap.docs.map((docItem) => {
        const data = docItem.data() as Record<string, unknown>;
        return {
          id: docItem.id,
          createdAt: data.createdAt as string | Date | TimestampLike | null,
          amountEuros: data.amountEuros as number | undefined,
          status: data.status as string | undefined,
        } as PayoutEntry;
      });
      setPayouts(rows);
    } catch (error) {
      console.error('Error leyendo payouts:', error);
    }
  };

  const precheckPayoutEligibility = () => {
    if (!reservaPagado || reservaEstado !== 'completado') {
      return { ok: false, reason: 'La reserva debe estar completada y pagada.' };
    }
    if (!reservaFechaEvento) {
      return { ok: false, reason: 'Fecha de evento inválida o ausente.' };
    }
    const dateValue =
      reservaFechaEvento instanceof Date
        ? reservaFechaEvento
        : typeof reservaFechaEvento === 'string'
          ? new Date(reservaFechaEvento)
          : typeof reservaFechaEvento === 'object' && typeof reservaFechaEvento.toDate === 'function'
            ? reservaFechaEvento.toDate()
            : typeof reservaFechaEvento === 'object' && typeof reservaFechaEvento.seconds === 'number'
              ? new Date(reservaFechaEvento.seconds * 1000)
              : new Date('');
    if (Number.isNaN(dateValue.getTime())) {
      return { ok: false, reason: 'Fecha de evento inválida o ausente.' };
    }
    const now = new Date();
    const daysMs = 7 * 24 * 60 * 60 * 1000;
    const eligibleDate = new Date(dateValue.getTime() + daysMs);
    if (now < eligibleDate) {
      const daysRemaining = Math.ceil((eligibleDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return { ok: false, reason: `Faltan ${daysRemaining} días para poder retirar el dinero.` };
    }
    return { ok: true };
  };

  const fetchPayoutAvailability = async () => {
    if (!partnerId || !reservaId) return;
    const endpoint = process.env.NEXT_PUBLIC_CHECK_PAYOUT;
    if (!endpoint) return;
    const idToken = await AuthService.getIdToken();
    if (!idToken) {
      setPayoutError('Sesión expirada. Vuelve a iniciar sesión.');
      return;
    }
    setCheckingPayout(true);
    setPayoutError(null);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ partnerId, reservaId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPayoutInfo(data);
        const rawError = String(data?.error ?? '');
        setPayoutError(
          rawError === 'No autorizado'
            ? 'Solo la cuenta principal puede hacer retiros de dinero.'
            : data?.error || 'No se pudo verificar el retiro'
        );
        return;
      }
      setPayoutInfo(data);
    } catch (error) {
      setPayoutError(error instanceof Error ? error.message : 'Error consultando retiro');
    } finally {
      setCheckingPayout(false);
    }
  };

  const handleCreatePayout = async () => {
    if (!partnerId || !reservaId) return;
    const endpoint = process.env.NEXT_PUBLIC_CREATE_PAYOUT;
    if (!endpoint) return;
    const idToken = await AuthService.getIdToken();
    if (!idToken) {
      setPayoutError('Sesión expirada. Vuelve a iniciar sesión.');
      return;
    }
    setCreatingPayout(true);
    setPayoutError(null);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ partnerId, reservaId }),
      });
      const data = await response.json();
      if (!response.ok) {
        const rawError = String(data?.error ?? '');
        setPayoutError(
          rawError === 'No autorizado'
            ? 'Solo la cuenta principal puede hacer retiros de dinero.'
            : data?.error || 'No se pudo solicitar el retiro'
        );
        setPayoutInfo((prev) => ({ ...(prev ?? {}), ...data }));
        return;
      }
      setPayoutInfo((prev) => ({ ...(prev ?? {}), ...data, canWithdraw: false }));
      await fetchPayoutAvailability();
    } catch (error) {
      setPayoutError(error instanceof Error ? error.message : 'Error solicitando retiro');
    } finally {
      setCreatingPayout(false);
    }
  };

  useEffect(() => {
    if (!dialogOpen) return;
    (async () => {
      await loadPayoutsFromFirestore();
      const existingPayout = await loadLatestPayoutFromFirestore();
      if (existingPayout) {
        setPayoutInfo({
          canWithdraw: false,
          alreadyWithdrawn: true,
          existingPayout,
        });
        return;
      }
      const precheck = precheckPayoutEligibility();
      if (!precheck.ok) {
        setPayoutInfo({
          canWithdraw: false,
          policyCompliant: false,
        });
        setPayoutError(precheck.reason || 'No se puede retirar todavía.');
        return;
      }
      await fetchPayoutAvailability();
    })();
  }, [dialogOpen]);

  const combinedItems = useMemo(() => {
    const facturaItems = list.map((factura) => ({
      kind: 'factura' as const,
      id: factura.id,
      date: getFacturaDate(factura),
      factura,
    }));
    const payoutItems = payouts.map((payout) => ({
      kind: 'payout' as const,
      id: payout.id,
      date:
        payout.createdAt instanceof Date
          ? payout.createdAt
          : typeof payout.createdAt === 'string'
            ? new Date(payout.createdAt)
            : payout.createdAt && typeof payout.createdAt.toDate === 'function'
              ? payout.createdAt.toDate()
              : payout.createdAt && typeof payout.createdAt.seconds === 'number'
                ? new Date(payout.createdAt.seconds * 1000)
                : null,
      payout,
    }));
    return [...facturaItems, ...payoutItems].sort((a, b) => {
      const aTime = a.date ? a.date.getTime() : 0;
      const bTime = b.date ? b.date.getTime() : 0;
      return bTime - aTime;
    });
  }, [list, payouts]);

  const payoutStatusLabel = (status?: string | null) => {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'paid') return 'Enviado';
    if (normalized === 'in_transit') return 'En tránsito';
    if (normalized === 'pending') return 'Pendiente de envío';
    return normalized ? normalized : 'Sin estado';
  };

  return (
    <Card className="border-none bg-white shadow-sm">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pagos</p>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base text-slate-900">Resumen</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Wallet className="h-4 w-4" />
                Ver pagos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] w-[98vw] max-w-[98vw] !max-w-[98vw] sm:!max-w-[98vw] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Facturas y pagos</DialogTitle>
              </DialogHeader>

              <div className="mt-3 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="order-2 lg:order-1">

                  {combinedItems.length === 0 ? (
                    <p className="text-sm text-slate-500">
                         Los pagos de usuarios aparecerán aquí.
                        
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {combinedItems.map((item) => {
                        if (item.kind === 'payout') {
                          const payoutAmount = item.payout.amountEuros ?? 0;
                          return (
                            <div key={`payout-${item.id}`} className="rounded-xl border border-slate-100 bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 rounded-lg bg-slate-200/60 p-2 text-slate-600">
                                    <Wallet className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">Retirada de dinero</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                      <span className="rounded bg-white/70 px-2 py-0.5 text-[11px]">
                                        {payoutStatusLabel(item.payout.status)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-rose-600">
                                    - {formatAmount(payoutAmount)}
                                  </p>
                                  <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                                    <Calendar className="h-3 w-3" />
                                    {item.date ? formatDate(item.date) : 'Sin fecha'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const factura = item.factura;
                        const tipo = getFacturaTipo(factura);
                        const amount = !leadKomvo && tipo === 'usuario' ? computeNetoAmount(factura, facturasAll) : getAmount(factura);
                        const number = getFacturaNumber(factura);
                        const status = getFacturaStatusLabel(factura);
                        const date = formatDate(getFacturaDate(factura));
                        const quantity = getFacturaQuantity(factura);
                        const userId = getFacturaUserId(factura);
                        const userName = userId ? asistentesByUserId.get(userId) : undefined;
                        return (
                          <div key={factura.id} className="rounded-xl border border-slate-100 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-1 rounded-lg bg-slate-200/60 p-2 text-slate-700">
                                  <Receipt className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {userName ? `Factura de ${userName}` : 'Factura de usuario'}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    {number && <span className="rounded bg-white px-2 py-0.5 text-[11px]">#{number}</span>}
                                    <span className="rounded bg-white px-2 py-0.5 text-[11px] capitalize">{status}</span>
                                    {typeof quantity === 'number' && (
                                      <span className="rounded bg-white px-2 py-0.5 text-[11px]">
                                        Entradas: {quantity}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-emerald-600">
                                  + {formatAmount(amount)}
                                </p>
                                <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                                  <Calendar className="h-3 w-3" />
                                  {date}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Resumen de pagos
                      </p>
                      <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                        <Receipt className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      {servicioPagado && servicioPagadoItems.length > 0 && (
                        <div className="rounded-xl border border-slate-100 bg-white/70 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {servicioPagadoLabel}
                          </p>
                          <div className="mt-2 space-y-1 text-xs text-slate-600">
                            {servicioPagadoItems.map((item, idx) => (
                              <div key={`${item.name}-${idx}`} className="flex items-center justify-between">
                                <span>
                                  {item.name}
                                  {item.quantity > 0 && (
                                    <span className="ml-1 text-slate-400">
                                      · {item.quantity} {servicioPagadoIsPerPerson ? 'personas' : 'ud'}
                                    </span>
                                  )}
                                </span>
                                <span className="font-semibold text-slate-700">
                                  {item.total != null ? formatAmountCents(item.total) : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between rounded-lg bg-transparent px-2 py-1.5">
                        <span className="text-slate-600">Pagos de usuarios</span>
                        <span className="font-semibold text-emerald-600">+ {formatAmount(totalUsuarios)}</span>
                      </div>
                      {leadKomvo && (
                        <div className="flex items-center justify-between rounded-lg bg-transparent px-2 py-1.5">
                          <span className="text-slate-600">Comisión</span>
                          <span className="font-semibold text-amber-600">- {formatAmount(totalComisiones)}</span>
                        </div>
                      )}
                      <div className="h-px w-full bg-slate-300/80" />
                      <div className="flex items-center justify-between rounded-lg bg-transparent px-2 py-1.5">
                        <span>Total a percibir</span>
                        <span className="text-base font-semibold text-slate-900">
                          {formatAmount(totalNetoRestaurante)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{facturasUsuarios.length} pagos</span>
                    </div>
                    {!payoutInfo?.existingPayout && !payoutInfo?.alreadyWithdrawn && (
                      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Retiro de fondos
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                              {formatAmount(
                                payoutInfo?.totalEuros != null ? payoutInfo.totalEuros : totalNetoRestaurante
                              )}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              {payoutInfo?.stripeAvailable === false && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600">
                                  No hay suficiente saldo en Stripe
                                </span>
                              )}
                              {payoutInfo?.policyDetails?.daysRemaining != null &&
                                payoutInfo.policyDetails.daysRemaining > 0 && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                                    Faltan {payoutInfo.policyDetails.daysRemaining} días
                                  </span>
                                )}
                              {payoutError && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600">
                                  {payoutError}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="min-w-[140px] text-right">
                            <p className="text-[11px] text-slate-500">Saldo Stripe</p>
                            <p className="mt-1 text-base font-semibold text-slate-900">
                              {payoutInfo?.availableEuros != null ? `${payoutInfo.availableEuros.toFixed(2)}€` : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            className="gap-2"
                            disabled={!payoutInfo?.canWithdraw || checkingPayout || creatingPayout}
                            onClick={() => void handleCreatePayout()}
                          >
                            {creatingPayout ? 'Solicitando…' : 'Solicitar retiro'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={checkingPayout}
                            onClick={() => void fetchPayoutAvailability()}
                          >
                            {checkingPayout ? 'Actualizando…' : 'Actualizar'}
                          </Button>
                        </div>
                      </div>
                    )}
                    {(payoutInfo?.existingPayout || payoutInfo?.payoutId) && (
                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase">
                              Dinero enviado
                            </span>
                          </div>
                          <div className="mt-2 grid gap-1">
                            <p>
                              <span className="text-slate-500">Fecha de solicitud:</span>{' '}
                              {formatDateValue(
                                payoutInfo?.existingPayout?.createdAt ||
                                  (payoutInfo as { createdAt?: string })?.createdAt ||
                                  (payoutInfo as { stripeCreated?: string })?.stripeCreated
                              )}
                            </p>
                            <p>
                              <span className="text-slate-500">Fecha estimada de llegada:</span>{' '}
                              {formatDateValue(
                                (payoutInfo as { arrivalDate?: string })?.arrivalDate ||
                                  (payoutInfo as { estimatedArrival?: string })?.estimatedArrival ||
                                  payoutInfo?.existingPayout?.arrivalDate
                              )}
                            </p>
                            <p>
                              <span className="text-slate-500">Importe:</span>{' '}
                              {(payoutInfo?.existingPayout?.amountEuros ??
                                (payoutInfo as { amountEuros?: number })?.amountEuros) !=
                              null
                                ? `${(
                                    payoutInfo?.existingPayout?.amountEuros ??
                                    (payoutInfo as { amountEuros?: number })?.amountEuros ??
                                    0
                                  ).toFixed(2)}€`
                                : '—'}
                            </p>
                            <p>
                              <span className="text-slate-500">Payout ID:</span>{' '}
                              {payoutInfo?.existingPayout?.payoutId ||
                                (payoutInfo as { payoutId?: string })?.payoutId ||
                                '—'}
                            </p>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cerrar</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <div className="grid gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Pagos de usuarios</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatAmount(totalUsuarios)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{facturasUsuarios.length} pagos</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
