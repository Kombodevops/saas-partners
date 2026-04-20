'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PendienteActionsDialog } from '@/app/dashboard/reservas/components/pendiente-actions-dialog';
import { ArrowLeft, Calendar as CalendarIcon, Copy, Package as PackageIcon, Lock, Eye, Home, DoorOpen, UserCheck, Tag } from 'lucide-react';
import {
  ReservaDetalleService,
  type ReservaDetalle,
  type AsistenciaDetalle,
  type FacturaDetalle,
  type CambioReserva,
} from '@/lib/services/reserva-detalle.service';
import { ReservaHeader } from '@/app/reservas/[id]/components/reserva-header';
import { NotasEtiquetasCard } from '@/app/reservas/[id]/components/notas-etiquetas-card';
import { AsistentesCard } from '@/app/reservas/[id]/components/asistentes-card';
import { FacturasCard } from '@/app/reservas/[id]/components/facturas-card';
import { ChatCard } from '@/app/reservas/[id]/components/chat-card';
import { RestaurantesService } from '@/lib/services/restaurantes.service';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';
import { PackCatalogService, type PackCatalogItem } from '@/lib/services/pack-catalog.service';
import { AuthService } from '@/lib/services/auth.service';
import { WorkersService } from '@/lib/services/workers.service';
import { AnalyticsChannelsService, type AnalyticsChannel } from '@/lib/services/analytics-channels.service';
import type { RestauranteResumen } from '@/lib/types/restaurante';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';
import { RestauranteSalaSection } from '@/app/dashboard/reservas/nueva/components/restaurante-sala-section';
import { ElementoEditor } from '@/app/dashboard/reservas/nueva/components/elemento-editor';
import { TicketsEditor, type TicketItem } from '@/app/dashboard/reservas/nueva/components/tickets-editor';
import { BarraLibreIntervalo } from '@/app/dashboard/reservas/nueva/components/barra-libre-intervalo';
import { CrearElementoModal } from '@/app/dashboard/reservas/nueva/components/crear-elemento-modal';

type ReservaDetalleContentProps = {
  reservaId?: string | null;
  variant?: 'page' | 'panel';
  onClose?: () => void;
};

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

const getTiempoSolicitadoLabel = (value: Record<string, unknown> | undefined): string | null => {
  if (!value) return null;
  const directCandidates = [
    value.tiempoSolicitado,
    value.TiempoSolicitado,
    value['Tiempo solicitado'],
    value.tiempo_solicitado,
    value.horasSolicitadas,
    value.HorasSolicitadas,
    value['Horas solicitadas'],
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  const intervalo = (value.intervaloSeleccionado as Record<string, unknown> | undefined) ?? undefined;
  if (intervalo) {
    const duracion = intervalo.duracionMin ?? intervalo['duraciónMin'];
    if (typeof duracion === 'string' && duracion.trim()) return duracion.trim();
    if (typeof duracion === 'number' && Number.isFinite(duracion)) return String(duracion);
  }
  return null;
};

const toPaxValue = (value?: string | number | null) => {
  if (value == null) return null;
  const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? String(value) : String(parsed);
};

const formatPaxRange = (min?: string | number | null, max?: string | number | null) => {
  const minValue = toPaxValue(min);
  const maxValue = toPaxValue(max);
  if (minValue && maxValue) return `${minValue} - ${maxValue} pax`;
  if (minValue) return `${minValue} pax`;
  if (maxValue) return `${maxValue} pax`;
  return '—';
};

const formatPrecioVal = (val: unknown): string => {
  if (val == null || val === '') return '—';
  const n = Number(val);
  if (!Number.isNaN(n)) return `${n.toFixed(2)} €`;
  return String(val);
};

const getAforoSolicitadoLabel = (reserva: ReservaDetalle | null) => {
  if (!reserva) return null;
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
      .concat(groupSizeCandidates.map((key) => reservaRecord?.[key] as Record<string, unknown> | undefined))
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
  return formatPaxRange(aforoMin, aforoMax);
};

export function ReservaDetalleContent({
  reservaId,
  variant = 'page',
  onClose,
}: ReservaDetalleContentProps) {
  const WEB_URL =
    process.env.NEXT_PUBLIC_WEB_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  const [reserva, setReserva] = useState<ReservaDetalle | null>(null);
  const [mensajesUnread, setMensajesUnread] = useState(0);
  const [chatNombre, setChatNombre] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [asistencias, setAsistencias] = useState<AsistenciaDetalle[]>([]);
	  const [facturas, setFacturas] = useState<FacturaDetalle[]>([]);
	  const [facturasAll, setFacturasAll] = useState<FacturaDetalle[]>([]);
	  const [showPackEditReason, setShowPackEditReason] = useState(false);
	  const [showCanalLockedReason, setShowCanalLockedReason] = useState(false);
	  const [showCerrarPlazoReason, setShowCerrarPlazoReason] = useState(false);
	  const [customSalaLocalEnabled, setCustomSalaLocalEnabled] = useState(false);
	  const [customSalaLocalNombre, setCustomSalaLocalNombre] = useState('');
	  const [customSalaLocalAforoMin, setCustomSalaLocalAforoMin] = useState<number | ''>('');
	  const [customSalaLocalAforoMax, setCustomSalaLocalAforoMax] = useState<number | ''>('');
  const [customSalaEspacioEnabled, setCustomSalaEspacioEnabled] = useState(false);
  const [customSalaEspacioNombre, setCustomSalaEspacioNombre] = useState('');
  const [customSalaEspacioAforoMin, setCustomSalaEspacioAforoMin] = useState<number | ''>('');
  const [customSalaEspacioAforoMax, setCustomSalaEspacioAforoMax] = useState<number | ''>('');
  const [responsables, setResponsables] = useState<
    Array<{ id: string; nombre: string; email?: string; role?: string; isOwner?: boolean }>
  >([]);
  const [responsableId, setResponsableId] = useState('');
  const [channels, setChannels] = useState<AnalyticsChannel[]>([]);
  const [canalDraft, setCanalDraft] = useState('');
  const [cliente, setCliente] = useState<{ email?: string | null; telefono?: string | null }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaLimiteDraft, setFechaLimiteDraft] = useState('');
  const [savingFechaLimite, setSavingFechaLimite] = useState(false);
  const [fechaLimiteMessage, setFechaLimiteMessage] = useState<string | null>(null);
  const [fechaLimiteDialogOpen, setFechaLimiteDialogOpen] = useState(false);
  const [eventoDialogOpen, setEventoDialogOpen] = useState(false);
  const [eventoFecha, setEventoFecha] = useState('');
  const [eventoHora, setEventoHora] = useState('');
  const [eventoHoraFin, setEventoHoraFin] = useState('');
  const [eventoAforoMin, setEventoAforoMin] = useState('');
  const [eventoAforoMax, setEventoAforoMax] = useState('');
  const [savingEvento, setSavingEvento] = useState(false);
  const [sendingManageEmail, setSendingManageEmail] = useState(false);
  const [localDialogOpen, setLocalDialogOpen] = useState(false);
  const [espacioDialogOpen, setEspacioDialogOpen] = useState(false);
  const [confirmLocalOpen, setConfirmLocalOpen] = useState(false);
  const [confirmEspacioOpen, setConfirmEspacioOpen] = useState(false);
  const [restaurantes, setRestaurantes] = useState<RestauranteResumen[]>([]);
  const [restauranteDetalle, setRestauranteDetalle] = useState<RestauranteDetalleDoc | null>(null);
  const [selectedRestauranteId, setSelectedRestauranteId] = useState('');
  const [selectedSalaNombre, setSelectedSalaNombre] = useState('');
  const [loadingRestaurantes, setLoadingRestaurantes] = useState(false);
  const [savingLocal, setSavingLocal] = useState(false);
  const [savingCambio, setSavingCambio] = useState<'accept' | 'reject' | null>(null);
  const [savingExpiredAction, setSavingExpiredAction] = useState<'confirm' | 'cancel' | null>(null);
  const [expiredConfirmOpen, setExpiredConfirmOpen] = useState(false);
  const [expiredConfirmAction, setExpiredConfirmAction] = useState<'confirm' | 'cancel' | null>(null);
  const [cancelLocalOpen, setCancelLocalOpen] = useState(false);
  const [savingCancelLocal, setSavingCancelLocal] = useState(false);
  const [emailFailDialog, setEmailFailDialog] = useState(false);
  const [emailFailLink, setEmailFailLink] = useState<string | null>(null);
  const [emailFailCopied, setEmailFailCopied] = useState(false);
  const [emailFailMode, setEmailFailMode] = useState<'confirm' | 'cancel' | null>(null);
  const [updateEmailFailDialog, setUpdateEmailFailDialog] = useState(false);
  const [cambioDialogOpen, setCambioDialogOpen] = useState(false);
  const [closeVentaDialogOpen, setCloseVentaDialogOpen] = useState(false);
  const [cambioFechaLimite, setCambioFechaLimite] = useState('');
  const [cambioFechaError, setCambioFechaError] = useState<string | null>(null);
  const [savingEspacio, setSavingEspacio] = useState(false);
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [confirmPackOpen, setConfirmPackOpen] = useState(false);
  const [packs, setPacks] = useState<PackCatalogItem[]>([]);
  const [selectedPackId, setSelectedPackId] = useState('');
  const [selectedPack, setSelectedPack] = useState<PackCatalogItem | null>(null);
  const [selectedElement, setSelectedElement] = useState<Record<string, unknown> | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<Record<string, unknown> | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<TicketItem[]>([]);
  const [elements, setElements] = useState<Array<Record<string, unknown>>>([]);
  const [anticipoActivo, setAnticipoActivo] = useState(false);
  const [anticipoDescripcion, setAnticipoDescripcion] = useState('');
  const [anticipoPrecio, setAnticipoPrecio] = useState<number>(0);
  const [packDialogInitialized, setPackDialogInitialized] = useState(false);
  const packDialogRef = useRef<HTMLDivElement | null>(null);
  const [allowSinCompraOverride, setAllowSinCompraOverride] = useState(false);
  const [confirmSinCompraOpen, setConfirmSinCompraOpen] = useState(false);
  const [savingSinCompraSala, setSavingSinCompraSala] = useState(false);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [savingPack, setSavingPack] = useState(false);
  const [hasAsistenciasPagadas, setHasAsistenciasPagadas] = useState(false);
  const [adhocEditItems, setAdhocEditItems] = useState<
    Array<{
      nombre: string;
      cantidad: number;
      precio_unitario: number;
      tipo: 'comida' | 'bebida';
    }>
  >([]);
  const [adhocManualNombre, setAdhocManualNombre] = useState('');
  const [adhocManualCantidad, setAdhocManualCantidad] = useState(1);
  const [adhocManualPrecio, setAdhocManualPrecio] = useState<number | ''>('');
  const [adhocManualTipo, setAdhocManualTipo] = useState<'comida' | 'bebida'>('comida');
  const [menuPreviewOpen, setMenuPreviewOpen] = useState(false);
  const [savingResponsableQuick, setSavingResponsableQuick] = useState(false);
  const [savingCanalQuick, setSavingCanalQuick] = useState(false);
  const [responsableQuickOpen, setResponsableQuickOpen] = useState(false);
  const [responsableQuickDraft, setResponsableQuickDraft] = useState('');
  const [canalQuickOpen, setCanalQuickOpen] = useState(false);
  const [canalQuickDraft, setCanalQuickDraft] = useState('');
  const [chatRightOffset, setChatRightOffset] = useState<number | undefined>(undefined);

  const isSinCompraPack = selectedPackId === 'sin_compra_anticipada' || selectedPackId === 'anticipo_por_persona';
  const isAnticipoPack = selectedPackId === 'anticipo_por_persona';
  const isAdhocDialog = selectedPackId === 'adhoc';

  const isKomvo = useMemo(() => {
    if (!reserva) return false;
    return typeof reserva.leadKomvo === 'boolean' ? reserva.leadKomvo : true;
  }, [reserva]);

  useEffect(() => {
    if (!reserva) return;
    console.log('[ReservaDetalleContent] leadKomvo debug', {
      reservaId: reserva.id,
      leadKomvo: reserva.leadKomvo,
      isKomvo,
    });
  }, [reserva, isKomvo]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const compute = () => {
      const leftCol = document.getElementById('reserva-detail-left-col');
      const leftRect = leftCol?.getBoundingClientRect() ?? null;
      if (leftRect && leftRect.width > 10) {
        const insetFromLeftCol = 48;
        const next = window.innerWidth - leftRect.right + insetFromLeftCol;
        if (!Number.isFinite(next) || next <= 0 || next >= window.innerWidth) {
          setChatRightOffset(undefined);
          return;
        }
        setChatRightOffset(Math.max(insetFromLeftCol, next));
        return;
      }

      const rail = document.getElementById('reserva-detail-right-rail');
      if (!rail) {
        setChatRightOffset(undefined);
        return;
      }
      const rect = rail.getBoundingClientRect();
      if (rect.width < 10) {
        setChatRightOffset(undefined);
        return;
      }
      const padding = 48;
      const next = window.innerWidth - rect.left + padding;
      if (!Number.isFinite(next) || next <= 0 || next >= window.innerWidth) {
        setChatRightOffset(undefined);
        return;
      }
      setChatRightOffset(Math.max(padding, next));
    };

    compute();
    window.setTimeout(compute, 0);
    window.addEventListener('resize', compute);
    const rail = document.getElementById('reserva-detail-right-rail');
    const observer =
      rail && 'ResizeObserver' in window ? new ResizeObserver(() => compute()) : null;
    if (rail && observer) observer.observe(rail);
    const mutation = new MutationObserver(() => compute());
    mutation.observe(document.body, { subtree: true, childList: true, attributes: true });

    return () => {
      window.removeEventListener('resize', compute);
      observer?.disconnect();
      mutation.disconnect();
    };
  }, [variant]);

  const toInputDate = (value?: string) => {
    if (!value) return '';
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);
  const yesterdayIso = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const formatDate = (value?: string) => {
    if (!value) return 'Sin fecha';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return value;
  };

  const fechaEvento = useMemo(() => {
    if (!reserva) return '';
    return toInputDate(reserva.kombo?.Fecha || '');
  }, [reserva]);

  const formatRange = (min?: string | number | null, max?: string | number | null) => {
    const minValue = min != null && String(min).trim() !== '' ? String(min) : null;
    const maxValue = max != null && String(max).trim() !== '' ? String(max) : null;
    if (minValue && maxValue) return `${minValue} - ${maxValue} pax`;
    if (minValue) return `${minValue} pax`;
    if (maxValue) return `${maxValue} pax`;
    return '—';
  };

  const loadRestaurantes = async (ownerId?: string | null) => {
    if (!ownerId) return [];
    setLoadingRestaurantes(true);
    try {
      const items = await RestaurantesService.getRestaurantesByOwnerId(ownerId);
      setRestaurantes(items);
      return items;
    } finally {
      setLoadingRestaurantes(false);
    }
  };

  const loadRestauranteDetalle = async (restauranteId: string) => {
    if (!restauranteId) {
      setRestauranteDetalle(null);
      return null;
    }
    const detalle = await RestauranteDetalleService.getRestauranteById(restauranteId);
    setRestauranteDetalle(detalle);
    return detalle;
  };

  useEffect(() => {
    if (!localDialogOpen) return;
    if (!restaurantes.length && reserva?.partnerId) {
      void loadRestaurantes(reserva.partnerId);
    }
  }, [localDialogOpen, restaurantes.length, reserva?.partnerId]);

  const loadPacks = async (ownerId?: string | null) => {
    if (!ownerId) return [];
    setLoadingPacks(true);
    try {
      const items = await PackCatalogService.getPacksByOwnerId(ownerId);
      setPacks(items);
      return items;
    } finally {
      setLoadingPacks(false);
    }
  };

  const loadResponsables = async (partnerId: string) => {
    const workers = await WorkersService.listWorkers(partnerId);
    setResponsables(workers);
  };

  const precio = useMemo(() => (reserva?.precio ?? {}) as Record<string, unknown>, [reserva]);
  const precioMenu = precio['Menú'] as Record<string, unknown> | undefined;
  const precioCocktail = precio.Cocktail as Record<string, unknown> | undefined;
  const precioBarra = precio['Barra Libre'] as Record<string, unknown> | undefined;
  const precioAnticipo = precio.Anticipo as Record<string, unknown> | undefined;
  const precioTickets = Array.isArray(precio.Tickets) ? (precio.Tickets as Array<Record<string, unknown>>) : [];
  const barraTiempoSolicitado = useMemo(() => getTiempoSolicitadoLabel(precioBarra), [precioBarra]);
  const isFlexibleNoAnticipo = useMemo(() => {
    const categoria = String(reserva?.pack?.Categoria ?? '').toLowerCase();
    const anticipoValue = (precioAnticipo?.Precio ?? precioAnticipo?.price) as number | string | undefined;
    const hasAnticipo = anticipoValue != null && Number(anticipoValue) > 0;
    return categoria === 'flexible' && !hasAnticipo;
  }, [reserva?.pack?.Categoria, precioAnticipo]);
  const canCancelReserva = useMemo(() => {
    const estado = (reserva?.estado ?? '').toLowerCase();
    if (!estado) return false;
    return !['fallado', 'expirado', 'completado', 'pendiente', 'pendientecambio'].includes(estado);
  }, [reserva?.estado]);
  const adhocSnapshot = precio.adhoc as
    | {
        items?: Array<Record<string, unknown>>;
        total?: number;
        total_cents?: number;
      }
    | undefined;
  const adhocItems = Array.isArray(adhocSnapshot?.items) ? adhocSnapshot?.items ?? [] : [];
  const isAdhocPack = (reserva?.pack?.Categoria ?? '').toLowerCase() === 'adhoc';
  const getStringField = (value: Record<string, unknown> | undefined, key: string): string => {
    const field = value?.[key];
    return typeof field === 'string' ? field : '';
  };
  const getNumberField = (value: Record<string, unknown> | undefined, key: string): number | null => {
    const field = value?.[key];
    return typeof field === 'number' ? field : null;
  };
  const menuPreview = useMemo(() => {
    const title = getStringField(precioMenu, 'Nombre') || 'Menú';
    const description = getStringField(precioMenu, 'Descripción');
    const priceValue = getNumberField(precioMenu, 'Precio');
    const price = priceValue != null ? `${Number(priceValue).toFixed(2)}€ / persona` : '';
    return { title, description, price };
  }, [precioMenu]);
  const planLabel =
    isAdhocPack
      ? 'Presupuesto personalizado'
      : reserva?.pack?.Categoria === 'Flexible'
      ? precioAnticipo
        ? 'Anticipo'
        : 'Consumo libre en el local'
      : reserva?.pack?.Subcategoria || reserva?.pack?.Categoria || 'Plan';
  const planPriceValue = isAdhocPack
    ? adhocSnapshot?.total ?? (typeof adhocSnapshot?.total_cents === 'number' ? adhocSnapshot.total_cents / 100 : null)
    : getNumberField(precioAnticipo, 'Precio') ??
      getNumberField(precioMenu, 'Precio') ??
      getNumberField(precioCocktail, 'Precio') ??
      getNumberField(precioBarra, 'Precio') ??
      precioTickets.find((item) => item?.price != null)?.price ??
      null;
  const planPriceLabel =
    planPriceValue != null && !Number.isNaN(Number(planPriceValue))
      ? `${Number(planPriceValue).toFixed(2)}€`
      : undefined;
  const planMainLabelForCard = isAdhocPack
    ? 'Presupuesto'
    : reserva?.pack?.Categoria === 'Flexible'
      ? precioAnticipo
        ? 'Anticipo'
        : 'Consumo libre en el local'
      : reserva?.pack?.Subcategoria || reserva?.pack?.Categoria || 'Plan';
  const servicioPagado = (reserva as Record<string, unknown> | null | undefined)?.servicio_pagado as
    | ServicioPagado
    | undefined;
  const servicioPagadoItems = useMemo(() => {
    return (servicioPagado?.items ?? [])
      .filter((item) => !String(item.name ?? '').toLowerCase().includes('costes de gestión'))
      .map((item) => ({
        name: item.name ?? 'Concepto',
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
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
  const servicioPagadoTotalCents = useMemo(() => {
    if (!servicioPagadoItems.length) return null;
    const sum = servicioPagadoItems.reduce((acc, item) => {
      if (typeof item.total === 'number') return acc + item.total;
      return acc;
    }, 0);
    return sum > 0 ? sum : null;
  }, [servicioPagadoItems]);
  const restauranteId = reserva?.restaurante?.id ?? '';
  const salaSnapshot = reserva?.sala as { permiteReservaSinCompraAnticipada?: boolean; nombre?: string } | undefined;
  const allowSinCompra = Boolean(salaSnapshot?.permiteReservaSinCompraAnticipada);
  const canUseSinCompra = allowSinCompra || allowSinCompraOverride;
  const salaNombreSeleccionada = selectedSalaNombre || (salaSnapshot?.nombre ?? '');
  const cambioSolicitado = reserva?.cambioSolicitado as
    | {
        aforoAnterior?: number;
        aforoNuevo?: number;
        fechaAnterior?: string;
        fechaNueva?: string;
        fechaSolicitud?: string;
        horaAnterior?: string;
        horaNueva?: string;
        horaFinAnterior?: string;
        horaFinNueva?: string;
      }
    | undefined;
  const cambioPendiente = (reserva?.estado ?? '').toLowerCase() === 'pendientecambio';
  const formatCambioFecha = (value?: string) => {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatCambioHora = (value?: string) => (value ? value : '--:--');

  const filterElementsByRestaurant = (pack: PackCatalogItem, restId: string) => {
    if (!restId) return [] as Array<Record<string, unknown>>;
    let items: Array<Record<string, unknown>> = [];
    if (pack.Categoria === 'Menú') items = (pack.Menus ?? []) as Array<Record<string, unknown>>;
    if (pack.Categoria === 'Tickets') items = (pack.Tickets ?? []) as Array<Record<string, unknown>>;
    if (pack.Categoria === 'Best Deal' && pack.Subcategoria === 'Barra Libre') {
      items = (pack['Barra Libre'] ?? []) as Array<Record<string, unknown>>;
    }
    if (pack.Categoria === 'Cocktail') items = (pack.Cocktails ?? []) as Array<Record<string, unknown>>;

    return items.filter((element) => {
      const restaurantesIds = (element.restaurantesIds ?? []) as string[];
      if (restaurantesIds.includes(restId)) return true;
      const disponibilidad = (element.disponibilidadPorRestaurante ?? []) as Array<Record<string, unknown>>;
      return disponibilidad.some((item) => item.restauranteId === restId);
    });
  };

  const getElementLabel = (pack: PackCatalogItem | null) => {
    if (!pack) return 'Elige elemento';
    if (pack.Subcategoria === 'Barra Libre' || pack.Categoria === 'Best Deal') return 'Elige barra libre';
    if (pack.Categoria === 'Menú') return 'Elige menú';
    if (pack.Categoria === 'Cocktail') return 'Elige cocktail';
    return 'Elige elemento';
  };

  const getElementPlaceholder = (pack: PackCatalogItem | null) => {
    if (!pack) return 'Selecciona un elemento';
    if (pack.Subcategoria === 'Barra Libre' || pack.Categoria === 'Best Deal') return 'Selecciona una barra libre';
    if (pack.Categoria === 'Menú') return 'Selecciona un menú';
    if (pack.Categoria === 'Cocktail') return 'Selecciona un cocktail';
    return 'Selecciona un elemento';
  };

  const getElementDescription = (pack: PackCatalogItem | null) => {
    if (!pack) return 'Elige un elemento y ajusta su contenido o precio para esta reserva.';
    if (pack.Subcategoria === 'Barra Libre' || pack.Categoria === 'Best Deal') {
      return 'Elige una barra libre y ajusta su contenido o precio para esta reserva, o bien crea una barra libre desde cero.';
    }
    if (pack.Categoria === 'Menú') {
      return 'Elige un menú y ajusta su contenido o precio para esta reserva, o bien crea un menú desde cero.';
    }
    if (pack.Categoria === 'Cocktail') {
      return 'Elige un cocktail y ajusta su contenido o precio para esta reserva, o bien crea un cocktail desde cero.';
    }
    return 'Elige un elemento y ajusta su contenido o precio para esta reserva.';
  };

  const getIntervalsForRestaurante = (element: Record<string, unknown> | null, restId: string) => {
    if (!element || !restId) return [] as Array<Record<string, unknown>>;
    const disponibilidad = (element.disponibilidadPorRestaurante ?? []) as Array<Record<string, unknown>>;
    const match = disponibilidad.find((item) => item.restauranteId === restId);
    const intervalos = (match?.intervalos ?? element.intervalos ?? []) as Array<Record<string, unknown>>;
    return intervalos;
  };

  const handleCreatedElement = (element: Record<string, unknown>) => {
    setElements((prev) => [...prev, element]);
    setSelectedElement(element);
  };

  const validPacksForRestaurante = useMemo(() => {
    const restauranteId = reserva?.restaurante?.id ?? '';
    if (!restauranteId) return [] as PackCatalogItem[];
    return packs.filter((pack) => {
      const restaurantesIds = Array.isArray(pack.restaurantesIds) ? pack.restaurantesIds : [];
      const appliesToRestaurant = restaurantesIds.length === 0 || restaurantesIds.includes(restauranteId);
      if (!appliesToRestaurant) return false;
      if (pack.activo === false) return false;
      if (pack.Categoria === 'Menú' || pack.Categoria === 'Tickets' || pack.Categoria === 'Cocktail') {
        return true;
      }
      if (pack.Categoria === 'Best Deal' && pack.Subcategoria === 'Barra Libre') return true;
      return false;
    });
  }, [packs, reserva?.restaurante?.id]);

  const canEditPackStatus = (estado: string) => {
    const normalized = estado.toLowerCase();
    if (normalized === 'expirado') return { ok: false, reason: 'La reserva está expirada.' };
    if (normalized === 'fallado') return { ok: false, reason: 'La reserva está fallada.' };
    if (normalized === 'completado') return { ok: false, reason: 'La reserva está completada.' };
    if (normalized !== 'aceptado') return { ok: false, reason: 'No se puede cambiar el plan con el estado de la reserva actual.' };
    return { ok: true, reason: '' };
  };

  const canSavePackChange = useMemo(() => {
    if (!selectedPackId) return false;
    if (isAdhocDialog) {
      return adhocEditItems.length > 0;
    }
    if (isSinCompraPack) {
      if (!isAnticipoPack) return true;
      return Boolean(anticipoDescripcion && anticipoPrecio != null && anticipoPrecio >= 2);
    }
    if (!selectedPack) return false;
    if (selectedPack.Categoria === 'Tickets') {
      return selectedTickets.some((ticket) => !ticket.disabled);
    }
    if (selectedPack.Subcategoria === 'Barra Libre') {
      return Boolean(selectedElement && selectedInterval);
    }
    return Boolean(selectedElement);
  }, [
    selectedPackId,
    selectedPack,
    selectedElement,
    selectedInterval,
    selectedTickets,
    anticipoDescripcion,
    anticipoPrecio,
    isSinCompraPack,
    isAnticipoPack,
    isAdhocDialog,
    adhocEditItems.length,
  ]);

  useEffect(() => {
    if (!packDialogOpen) return;
    requestAnimationFrame(() => {
      if (typeof document === 'undefined') return;
      const container = packDialogRef.current;
      if (!container) return;
      const active = document.activeElement;
      if (active && container.contains(active)) return;
      container.focus({ preventScroll: true });
    });
    if (!selectedPackId || isSinCompraPack || isAdhocDialog) {
      const hasState =
        selectedPack ||
        selectedElement ||
        selectedInterval ||
        elements.length > 0 ||
        selectedTickets.length > 0;
      if (!hasState) return;
      setSelectedPack(null);
      setSelectedElement(null);
      setSelectedInterval(null);
      setElements([]);
      setSelectedTickets([]);
      setAnticipoActivo(isAnticipoPack);
      if (!isAnticipoPack) {
        setAnticipoDescripcion('');
        setAnticipoPrecio(0);
      }
      return;
    }
    const pack = packs.find((item) => item.id === selectedPackId) ?? null;
    if (pack === selectedPack) return;
    setSelectedPack(pack);
    if (pack && restauranteId) {
      const available = filterElementsByRestaurant(pack, restauranteId);
      setElements(available);
      if (pack.Categoria === 'Tickets') {
        const ticketsFromPrecio = precioTickets.map((ticket) => ({
          nombre: String(ticket.ticket ?? ''),
          price: Number(ticket.price ?? 0),
          quantity: Number(ticket.quantity ?? 0),
        }));
        setSelectedTickets(
          available.map((ticket) => {
            const name = String(ticket.Nombre ?? '');
            const match = ticketsFromPrecio.find((item) => item.nombre === name);
            return {
              ...ticket,
              Precio: match ? match.price : Number(ticket.Precio ?? 0),
              quantity: match ? match.quantity : Number(reserva?.aforoMax ?? 1),
              disabled: !match,
            } as TicketItem;
          })
        );
        setSelectedElement(null);
      } else {
        setSelectedTickets([]);
      }
    } else {
      setElements([]);
      setSelectedElement(null);
      setSelectedTickets([]);
    }
    setSelectedInterval(null);
  }, [
    packDialogOpen,
    selectedPackId,
    packs,
    restauranteId,
    reserva?.aforoMax,
    precioTickets,
    selectedPack,
    selectedElement,
    selectedInterval,
    elements.length,
    selectedTickets.length,
    isSinCompraPack,
    isAnticipoPack,
  ]);

  const paymentWindowConcluded = useMemo(() => {
    if (!reserva?.fechaLimitePago) return false;
    const limite = new Date(reserva.fechaLimitePago);
    if (Number.isNaN(limite.getTime())) return false;
    const today = new Date();
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return limite < midnight;
  }, [reserva?.fechaLimitePago]);

  const packEditAvailability = useMemo(() => {
    if (!reserva) return { canEdit: false, reason: 'Reserva no cargada.' };
    const statusCheck = canEditPackStatus(reserva.estado ?? '');
    if (!statusCheck.ok) return { canEdit: false, reason: statusCheck.reason };
    if (isAdhocPack) {
      if (reserva.pagado) return { canEdit: false, reason: 'La reserva ya está pagada.' };
      if (hasAsistenciasPagadas) {
        return { canEdit: false, reason: 'Hay asistentes con pago confirmado.' };
      }
      return { canEdit: true, reason: '' };
    }
    const tipoCompra = (reserva.tipoCompra ?? '').toLowerCase();
    if (tipoCompra === 'entradas') {
      if (paymentWindowConcluded) {
        return { canEdit: false, reason: 'El periodo de pago ha concluido.' };
      }
      if (hasAsistenciasPagadas) {
        return { canEdit: false, reason: 'Hay asistentes con pago confirmado.' };
      }
    } else {
      if (reserva.pagado) {
        return {
          canEdit: false,
          reason: isFlexibleNoAnticipo
            ? 'Reserva sin anticipo: no requiere pago.'
            : 'La reserva ya está pagada.',
        };
      }
    }
    return { canEdit: true, reason: '' };
  }, [reserva, paymentWindowConcluded, hasAsistenciasPagadas, isAdhocPack, isFlexibleNoAnticipo]);

  const channelMap = useMemo(
    () =>
      Object.fromEntries(
        channels
          .filter((channel) => channel.name)
          .map((channel) => [channel.name.toLowerCase(), channel])
      ),
    [channels]
  );

  const originBadge = useMemo(() => {
    if (!reserva) return null;
    const rawCanal = (reserva as Record<string, unknown>)?.canal;
    const canal = typeof rawCanal === 'string' ? rawCanal.trim() : '';
    if (reserva.leadKomvo === false && canal) {
      return {
        label: `Reserva de ${canal}`,
        className: 'border-slate-200 bg-slate-50 text-slate-600',
      };
    }
    if (reserva.leadKomvo === false) {
      return { label: 'Reserva del restaurante', className: 'border-slate-200 bg-slate-50 text-slate-600' };
    }
    return { label: 'Reserva de Komvo', className: 'border-slate-200 bg-slate-50 text-slate-600' };
  }, [reserva, channelMap]);

  const aforoSolicitadoLabel = useMemo(() => getAforoSolicitadoLabel(reserva), [reserva]);

  const numeroFinalAsistentes = useMemo(() => {
    const raw = reserva?.numeroFinalAsistentes;
    const normalized = typeof raw === 'string' ? raw.trim().replace(',', '.') : raw;
    const parsed = typeof normalized === 'number' ? normalized : Number(normalized);
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
    return asistencias.length;
  }, [reserva?.numeroFinalAsistentes, asistencias.length]);

  const asistentesStats = useMemo(
    () => ({
      totalAsistentes: numeroFinalAsistentes,
      confirmados: 0,
      confirmadosNoPagados: 0,
      pagados: 0,
      talvez: 0,
      noAsisten: 0,
    }),
    [numeroFinalAsistentes]
  );

  const loadAll = async (options?: { silent?: boolean }) => {
    if (!reservaId) return;
    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const reservaData = await ReservaDetalleService.getReservaById(reservaId);
      if (!reservaData) {
        setError('Reserva no encontrada');
        return;
      }
      setReserva(reservaData);
      setResponsableId((reservaData as { responsableEquipo?: { id?: string } | null })?.responsableEquipo?.id ?? '');
      setCanalDraft(
        typeof (reservaData as Record<string, unknown>)?.canal === 'string'
          ? String((reservaData as Record<string, unknown>).canal ?? '')
          : ''
      );

      const chatData = await ReservaDetalleService.getChatByReservaId(reservaId);
      setChatId(chatData?.id ?? null);
      setChatNombre(chatData?.nombreChat ?? '');
      const inbox = await ReservaDetalleService.getChatInbox({
        chatId: chatData?.id,
        partnerId: reservaData.partnerId ?? null,
      });
      setMensajesUnread(inbox.unreadCount ?? 0);

      const todasAsistencias = await ReservaDetalleService.getAsistencias(reservaId);
      setAsistencias(todasAsistencias);

      const facturasResult = await ReservaDetalleService.getFacturas(reservaId);
      setFacturas(facturasResult.visibles);
      setFacturasAll(facturasResult.facturas);

      const fallbackCliente = {
        email:
          reservaData.usuario?.Email ??
          (reservaData.usuario as { email?: string } | undefined)?.email ??
          null,
        telefono: reservaData.usuario?.Telefono ?? null,
      };
      if (!reservaData.leadKomvo) {
        const clienteData = await ReservaDetalleService.getClienteDatos({
          reservaId,
          clienteId: reservaData.usuario?.id,
          clienteEmail: reservaData.usuario?.Email,
          clienteTelefono: reservaData.usuario?.Telefono,
        });
        setCliente({ ...fallbackCliente, ...clienteData });
      } else {
        setCliente(fallbackCliente);
      }

      const anyPagado = await ReservaDetalleService.hasAsistenciasPagadas(reservaId);
      setHasAsistenciasPagadas(anyPagado);

      setFechaLimiteDraft(toInputDate(reservaData.fechaLimitePago));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando la reserva');
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadAll();
  }, [reservaId]);

  useEffect(() => {
    if (!reserva?.partnerId) return;
    void loadResponsables(reserva.partnerId);
  }, [reserva?.partnerId]);

  useEffect(() => {
    let active = true;
    if (!reserva?.partnerId) return undefined;
    void (async () => {
      const result = await AnalyticsChannelsService.getChannelsWithColors(reserva.partnerId ?? '');
      if (active) setChannels(result);
    })();
    return () => {
      active = false;
    };
  }, [reserva?.partnerId]);

  const openLocalDialog = async () => {
    if (!reserva) return;
    setLocalDialogOpen(true);
    const items = restaurantes.length ? restaurantes : await loadRestaurantes(reserva.partnerId ?? '');
    const currentRestauranteId = reserva.restaurante?.id || items[0]?.id || '';
    setSelectedRestauranteId(currentRestauranteId);
    const detalle = await loadRestauranteDetalle(currentRestauranteId);
    const salaActual = (reserva.sala as { nombre?: string } | null | undefined)?.nombre ?? '';
    const salaDefault =
      salaActual ||
      (detalle?.salas && detalle.salas.length > 0 ? detalle.salas[0]?.nombre ?? '' : '');
    setSelectedSalaNombre(salaDefault);
  };

  const openEspacioDialog = async () => {
    if (!reserva) return;
    setEspacioDialogOpen(true);
    const restauranteId = reserva.restaurante?.id || '';
    if (restauranteId) {
      const detalle = await loadRestauranteDetalle(restauranteId);
      const salaActual = (reserva.sala as { nombre?: string } | null | undefined)?.nombre ?? '';
      const salaDefault =
        salaActual ||
        (detalle?.salas && detalle.salas.length > 0 ? detalle.salas[0]?.nombre ?? '' : '');
      setSelectedSalaNombre(salaDefault);
    }
  };

  const handleCambioAction = async (action: 'accept' | 'reject') => {
    if (!reserva?.id) return;
    setSavingCambio(action);
    try {
      if (action === 'accept') {
        await ReservaDetalleService.aceptarCambioReserva({
          reservaId: reserva.id,
          fechaLimitePago: cambioFechaLimite,
        });
      } else {
        await ReservaDetalleService.rechazarCambioReserva({ reservaId: reserva.id });
      }
      await loadAll({ silent: true });
    } finally {
      setSavingCambio(null);
    }
  };

  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const openCambioDialog = () => {
    setCambioFechaLimite(reserva?.fechaLimitePago ?? '');
    setCambioFechaError(null);
    setCambioDialogOpen(true);
  };
  const confirmCambio = async () => {
    if (!cambioFechaLimite) {
      setCambioFechaError('Indica una fecha límite de pago.');
      return;
    }
    if (cambioFechaLimite < todayISO) {
      setCambioFechaError('La fecha límite no puede ser anterior a hoy.');
      return;
    }
    if (cambioSolicitado?.fechaNueva && cambioFechaLimite > cambioSolicitado.fechaNueva) {
      setCambioFechaError('La fecha límite no puede ser posterior a la nueva fecha del evento.');
      return;
    }
    setCambioFechaError(null);
    setCambioDialogOpen(false);
    await handleCambioAction('accept');
  };

  const handleExpiredAction = async (action: 'confirm' | 'cancel') => {
    if (!reserva?.id) return;
    setSavingExpiredAction(action);
    try {
      const manageUrl =
        WEB_URL && reserva?.id
          ? reserva.leadKomvo
            ? `${WEB_URL}/plan/${reserva.id}/gestionar`
            : !reserva.pagado
              ? `${WEB_URL}/pres/${reserva.id}`
              : `${WEB_URL}/plan/${reserva.id}/gestionar`
          : null;
      if (action === 'confirm') {
        const result = await ReservaDetalleService.confirmarReservaExpirada({ reservaId: reserva.id });
        if (result && result.missingUser) {
          setEmailFailMode('confirm');
          setEmailFailLink(manageUrl);
          setEmailFailDialog(true);
        }
      } else {
        const result = await ReservaDetalleService.cancelarReservaExpirada({ reservaId: reserva.id });
        if (result && result.missingUser) {
          setEmailFailMode('cancel');
          setEmailFailLink(null);
          setEmailFailDialog(true);
        }
      }
      await loadAll({ silent: true });
    } finally {
      setSavingExpiredAction(null);
    }
  };

  const openEventoDialog = () => {
    if (!reserva) return;
    const komboRecord = (reserva.kombo ?? {}) as Record<string, unknown>;
    const size = (komboRecord['Tamaño del grupo'] ?? {}) as Record<string, unknown>;
    setEventoFecha(String(komboRecord.Fecha ?? ''));
    setEventoHora(String(komboRecord.Hora ?? ''));
    setEventoHoraFin(String(komboRecord.horaFin ?? ''));
    setEventoAforoMin(String(size.min ?? ''));
    setEventoAforoMax(String(size.max ?? ''));
    setEventoDialogOpen(true);
  };

  const saveEvento = async () => {
    if (!reserva) return;
    setSavingEvento(true);
    try {
      const komboCurrent = (reserva.kombo ?? {}) as Record<string, unknown>;
      const sizeCurrent = (komboCurrent['Tamaño del grupo'] ?? {}) as Record<string, unknown>;
      const normalizeText = (value: unknown) => String(value ?? '').trim();
      const normalizeNumberText = (value: unknown) => {
        const text = String(value ?? '').trim();
        if (!text) return '';
        const parsed = Number(text.replace(',', '.'));
        return Number.isNaN(parsed) ? text : String(parsed);
      };
      const hasEventoChanges =
        normalizeText(komboCurrent.Fecha) !== normalizeText(eventoFecha) ||
        normalizeText(komboCurrent.Hora) !== normalizeText(eventoHora) ||
        normalizeText(komboCurrent.horaFin) !== normalizeText(eventoHoraFin) ||
        normalizeNumberText(sizeCurrent.min) !== normalizeNumberText(eventoAforoMin) ||
        normalizeNumberText(sizeCurrent.max) !== normalizeNumberText(eventoAforoMax);

      const nextKombo: Record<string, unknown> = {
        ...komboCurrent,
        Fecha: eventoFecha,
        Hora: eventoHora,
        horaFin: eventoHoraFin,
        'Tamaño del grupo': {
          ...(sizeCurrent as Record<string, unknown> | undefined),
          min: normalizeNumberText(eventoAforoMin),
          max: normalizeNumberText(eventoAforoMax),
        },
      };
      if (hasEventoChanges) {
        const cambiosEvento: CambioReserva[] = [];
        if (normalizeText(komboCurrent.Fecha) !== normalizeText(eventoFecha))
          cambiosEvento.push({ campo: 'fecha', label: 'Fecha del evento', anterior: String(komboCurrent.Fecha ?? ''), nuevo: eventoFecha });
        if (normalizeText(komboCurrent.Hora) !== normalizeText(eventoHora))
          cambiosEvento.push({ campo: 'hora', label: 'Hora de inicio', anterior: String(komboCurrent.Hora ?? ''), nuevo: eventoHora });
        if (normalizeText(komboCurrent.horaFin) !== normalizeText(eventoHoraFin))
          cambiosEvento.push({ campo: 'horaFin', label: 'Hora de fin', anterior: String(komboCurrent.horaFin ?? ''), nuevo: eventoHoraFin });
        if (normalizeNumberText(sizeCurrent.min) !== normalizeNumberText(eventoAforoMin))
          cambiosEvento.push({ campo: 'aforoMin', label: 'Aforo mínimo', anterior: String(sizeCurrent.min ?? ''), nuevo: eventoAforoMin });
        if (normalizeNumberText(sizeCurrent.max) !== normalizeNumberText(eventoAforoMax))
          cambiosEvento.push({ campo: 'aforoMax', label: 'Aforo máximo', anterior: String(sizeCurrent.max ?? ''), nuevo: eventoAforoMax });

        const updateResult = await ReservaDetalleService.updateReservaEvento({
          reservaId: reserva.id,
          kombo: nextKombo,
          cambios: cambiosEvento,
        });
        if (updateResult?.missingEmail) {
          setUpdateEmailFailDialog(true);
        }
      }
      await loadAll({ silent: true });
      setEventoDialogOpen(false);
    } finally {
      setSavingEvento(false);
    }
  };

  const openFechaLimiteDialog = () => {
    if (!reserva) return;
    setFechaLimiteDraft(toInputDate(reserva.fechaLimitePago));
    setFechaLimiteMessage(null);
    setFechaLimiteDialogOpen(true);
  };

  const openPackDialog = async () => {
    if (!reserva) return;
    setPackDialogOpen(true);
    setPackDialogInitialized(false);
    setAllowSinCompraOverride(false);
    const items = packs.length ? packs : await loadPacks(reserva.partnerId ?? '');
    const packSnapshot = reserva.pack as { tipo?: string | null; Categoria?: string | null } | undefined;
    const isSinCompra = packSnapshot?.tipo === 'sin_compra_anticipada' || packSnapshot?.Categoria === 'Flexible';
    const isAdhocSnapshot = (packSnapshot?.Categoria ?? '').toLowerCase() === 'adhoc';
    const hasAnticipo = Boolean(precioAnticipo?.Precio);
    const currentPackId = isAdhocSnapshot
      ? 'adhoc'
      : isSinCompra
        ? hasAnticipo
          ? 'anticipo_por_persona'
          : 'sin_compra_anticipada'
        : (reserva.pack as { id?: string | null } | null | undefined)?.id ||
          items.find((pack) => pack['Nombre del pack'] === reserva.pack?.['Nombre del pack'])?.id ||
          '';
    setSelectedPackId(currentPackId);
    if (isSinCompra) {
      setAnticipoActivo(hasAnticipo);
      setAnticipoDescripcion(getStringField(precioAnticipo, 'Descripción'));
      setAnticipoPrecio(getNumberField(precioAnticipo, 'Precio') ?? 0);
    }
    if (isAdhocSnapshot) {
      const items = adhocItems
        .map((item) => ({
          nombre: String(item?.nombre ?? ''),
          cantidad: Number(item?.cantidad ?? 0),
          precio_unitario: Number(item?.precio_unitario ?? 0),
          tipo: (String(item?.tipo ?? 'bebida').toLowerCase() === 'comida' ? 'comida' : 'bebida') as 'comida' | 'bebida',
        }))
        .filter((item) => item.nombre.trim().length > 0);
      setAdhocEditItems(items);
    }
  };

  useEffect(() => {
    if (!packDialogOpen || packDialogInitialized || !reserva) return;
    if (isSinCompraPack) {
      setPackDialogInitialized(true);
      return;
    }
    if (!selectedPack) return;
    if (selectedPack.Categoria === 'Menú' && precioMenu) {
      const match = elements.find((element) => String(element.Nombre) === String(precioMenu.Nombre));
      setSelectedElement(match ? { ...match, ...precioMenu } : { ...precioMenu });
    }
    if (selectedPack.Categoria === 'Cocktail' && precioCocktail) {
      const match = elements.find((element) => String(element.Nombre) === String(precioCocktail.Nombre));
      setSelectedElement(match ? { ...match, ...precioCocktail } : { ...precioCocktail });
    }
    if (selectedPack.Subcategoria === 'Barra Libre' && precioBarra) {
      const match = elements.find((element) => String(element.Nombre) === String(precioBarra.Nombre));
      setSelectedElement(match ? { ...match, ...precioBarra } : { ...precioBarra });
      setSelectedInterval((precioBarra.intervaloSeleccionado as Record<string, unknown>) ?? null);
    }
    setPackDialogInitialized(true);
  }, [packDialogOpen, packDialogInitialized, selectedPackId, selectedPack, elements, reserva, precioMenu, precioCocktail, precioBarra]);

  const buildPrecioForPackChange = () => {
    const precioPayload: Record<string, unknown> = {};
    if (isAdhocDialog) {
      const items = adhocEditItems.map((item) => ({
        tipo: item.tipo,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        total: item.precio_unitario * item.cantidad,
        total_cents: Math.round(item.precio_unitario * item.cantidad * 100),
      }));
      const total = items.reduce((sum, item) => sum + item.total, 0);
      precioPayload.adhoc = {
        items,
        total,
        total_cents: Math.round(total * 100),
      };
      return precioPayload;
    }
    if (isSinCompraPack) {
      if (isAnticipoPack && anticipoDescripcion && anticipoPrecio != null) {
        precioPayload.Anticipo = {
          'Descripción': anticipoDescripcion,
          Precio: anticipoPrecio,
        };
      }
      return precioPayload;
    }
    if (!selectedPack) return precioPayload;
    if (selectedPack.Categoria === 'Menú' && selectedElement) {
      precioPayload['Menú'] = selectedElement;
    } else if (selectedPack.Categoria === 'Cocktail' && selectedElement) {
      precioPayload.Cocktail = selectedElement;
    } else if (selectedPack.Categoria === 'Tickets') {
      const tickets = (selectedTickets ?? []).filter((ticket) => !ticket.disabled);
      precioPayload.Tickets = tickets.map((ticket) => ({
        price: Number(ticket.Precio ?? 0),
        quantity: Number(ticket.quantity ?? reserva?.aforoMax ?? 1),
        ticket: ticket.Nombre ?? 'Ticket',
      }));
    } else if (selectedPack.Subcategoria === 'Barra Libre' && selectedElement) {
      const element = { ...selectedElement } as Record<string, unknown>;
      if (selectedInterval) {
        element.intervaloSeleccionado = selectedInterval;
        element.Precio = Number((selectedInterval as Record<string, unknown>).precio ?? 0);
      }
      precioPayload['Barra Libre'] = element;
    }
    return precioPayload;
  };

  const confirmUpdatePack = async () => {
    if (!reserva || !selectedPackId) return;
    let selected = packs.find((pack) => pack.id === selectedPackId) ?? null;
    if (isSinCompraPack) {
      selected = {
        id: 'sin_compra_anticipada',
        Categoria: 'Flexible',
        'Nombre del pack': 'Consumo libre en el local',
        tipo: 'sin_compra_anticipada',
        Descripción: '',
      } as PackCatalogItem;
    }
    if (isAdhocDialog) {
      selected = {
        id: 'adhoc',
        Categoria: 'adhoc',
        'Nombre del pack': 'Presupuesto personalizado',
        tipo: 'adhoc',
        Descripción: '',
      } as PackCatalogItem;
    }
    if (!selected) return;
    setSavingPack(true);
    try {
      const precioPayload = buildPrecioForPackChange();

      const cambiosPack: CambioReserva[] = [];
      const oldPack = reserva.pack as Record<string, unknown> | undefined;
      const oldPrecio = (reserva as Record<string, unknown>).precio as Record<string, unknown> | undefined ?? {};
      const oldNombrePack = String(oldPack?.['Nombre del pack'] ?? 'Sin plan');
      const newNombrePack = String(selected['Nombre del pack'] ?? '');
      if (oldNombrePack !== newNombrePack)
        cambiosPack.push({ campo: 'plan', label: 'Plan', anterior: oldNombrePack, nuevo: newNombrePack });

      if (selected.Categoria === 'Menú' || selected.Categoria === 'Cocktail') {
        const key = selected.Categoria === 'Menú' ? 'Menú' : 'Cocktail';
        const oldEl = oldPrecio[key] as Record<string, unknown> | undefined;
        const newEl = precioPayload[key] as Record<string, unknown> | undefined;
        const oldElNombre = String(oldEl?.Nombre ?? '—');
        const newElNombre = String(newEl?.Nombre ?? '—');
        if (oldElNombre !== newElNombre)
          cambiosPack.push({ campo: 'menu', label: selected.Categoria === 'Menú' ? 'Menú seleccionado' : 'Cocktail seleccionado', anterior: oldElNombre, nuevo: newElNombre });
        const oldElPrecio = formatPrecioVal(oldEl?.Precio);
        const newElPrecio = formatPrecioVal(newEl?.Precio);
        if (oldElPrecio !== newElPrecio)
          cambiosPack.push({ campo: 'precio', label: 'Precio', anterior: oldElPrecio, nuevo: newElPrecio });
      } else if (selected.Categoria === 'Tickets') {
        const oldTickets = (oldPrecio.Tickets as Array<Record<string, unknown>> | undefined) ?? [];
        const newTickets = (precioPayload.Tickets as Array<Record<string, unknown>> | undefined) ?? [];
        const oldStr = oldTickets.map((t) => `${String(t.ticket ?? '')} x${String(t.quantity ?? '')} (${formatPrecioVal(t.price)})`).join(', ') || '—';
        const newStr = newTickets.map((t) => `${String(t.ticket ?? '')} x${String(t.quantity ?? '')} (${formatPrecioVal(t.price)})`).join(', ') || '—';
        if (oldStr !== newStr)
          cambiosPack.push({ campo: 'tickets', label: 'Tickets', anterior: oldStr, nuevo: newStr });
      } else if ((selected as Record<string, unknown>).Subcategoria === 'Barra Libre') {
        const oldBL = oldPrecio['Barra Libre'] as Record<string, unknown> | undefined;
        const newBL = precioPayload['Barra Libre'] as Record<string, unknown> | undefined;
        const oldBLNombre = String(oldBL?.Nombre ?? '—');
        const newBLNombre = String(newBL?.Nombre ?? '—');
        if (oldBLNombre !== newBLNombre)
          cambiosPack.push({ campo: 'barraLibre', label: 'Barra libre', anterior: oldBLNombre, nuevo: newBLNombre });
        const oldInterval = oldBL?.intervaloSeleccionado as Record<string, unknown> | undefined;
        const newInterval = newBL?.intervaloSeleccionado as Record<string, unknown> | undefined;
        const oldDuracion = String(oldInterval?.duracionMin ?? '—');
        const newDuracion = String(newInterval?.duracionMin ?? '—');
        if (oldDuracion !== newDuracion)
          cambiosPack.push({ campo: 'duracion', label: 'Duración', anterior: oldDuracion, nuevo: newDuracion });
        const oldBLPrecio = formatPrecioVal(oldBL?.Precio);
        const newBLPrecio = formatPrecioVal(newBL?.Precio);
        if (oldBLPrecio !== newBLPrecio)
          cambiosPack.push({ campo: 'precio', label: 'Precio', anterior: oldBLPrecio, nuevo: newBLPrecio });
      } else if (isAnticipoPack) {
        const oldAnticipo = oldPrecio.Anticipo as Record<string, unknown> | undefined;
        const oldDesc = String(oldAnticipo?.['Descripción'] ?? '—');
        const newDesc = anticipoDescripcion || '—';
        if (oldDesc !== newDesc)
          cambiosPack.push({ campo: 'anticipoDesc', label: 'Descripción anticipo', anterior: oldDesc, nuevo: newDesc });
        const oldPrecioAnticipo = formatPrecioVal(oldAnticipo?.Precio);
        const newPrecioAnticipo = formatPrecioVal(anticipoPrecio);
        if (oldPrecioAnticipo !== newPrecioAnticipo)
          cambiosPack.push({ campo: 'anticipoPrecio', label: 'Precio anticipo', anterior: oldPrecioAnticipo, nuevo: newPrecioAnticipo });
      } else if (isAdhocDialog) {
        const oldAdhoc = oldPrecio.adhoc as Record<string, unknown> | undefined;
        const oldTotal = formatPrecioVal(oldAdhoc?.total);
        const newTotal = formatPrecioVal((precioPayload.adhoc as Record<string, unknown> | undefined)?.total);
        if (oldTotal !== newTotal)
          cambiosPack.push({ campo: 'adhocTotal', label: 'Total presupuesto', anterior: oldTotal, nuevo: newTotal });
      }

      const updateResult = await ReservaDetalleService.updateReservaPack({
        reservaId: reserva.id,
        pack: selected,
        precio: precioPayload,
        cambios: cambiosPack,
      });
      if (updateResult?.missingEmail) {
        setUpdateEmailFailDialog(true);
      }
      await loadAll({ silent: true });
      setPackDialogOpen(false);
    } finally {
      setSavingPack(false);
      setConfirmPackOpen(false);
    }
  };

  const handleEnableSinCompraSala = async () => {
    if (!restauranteId || !salaNombreSeleccionada) return;
    const salas = restauranteDetalle?.salas ?? [];
    if (salas.length === 0) return;
    setSavingSinCompraSala(true);
    try {
      const nextSalas = salas.map((sala) => {
        const normalized = {
          ...sala,
          aforoMinimo: Number(sala.aforoMinimo ?? 0),
          aforoMaximo: Number(sala.aforoMaximo ?? 0),
          precioPrivatizacion: Number(sala.precioPrivatizacion ?? 0),
          caracteristicas: sala.caracteristicas ?? {},
        };
        return sala.nombre === salaNombreSeleccionada
          ? { ...normalized, permiteReservaSinCompraAnticipada: true }
          : normalized;
      });
      await RestauranteDetalleService.updateSalas(restauranteId, { salas: nextSalas });
      setRestauranteDetalle((prev) => (prev ? { ...prev, salas: nextSalas } : prev));
      setReserva((prev) =>
        prev && prev.sala
          ? {
              ...prev,
              sala: {
                ...prev.sala,
                permiteReservaSinCompraAnticipada: true,
              },
            }
          : prev
      );
    } finally {
      setSavingSinCompraSala(false);
      setConfirmSinCompraOpen(false);
    }
  };

  const handleRestauranteChange = async (value: string) => {
    setSelectedRestauranteId(value);
    const detalle = await loadRestauranteDetalle(value);
    const salaDefault = detalle?.salas && detalle.salas.length > 0 ? detalle.salas[0]?.nombre ?? '' : '';
    setSelectedSalaNombre(salaDefault);
    setCustomSalaLocalEnabled(false);
  };

  const confirmUpdateLocal = async () => {
    if (!reserva || !selectedRestauranteId) return;
    setSavingLocal(true);
    try {
      const oldLocalNombre = String((reserva.restaurante as Record<string, unknown> | undefined)?.['Nombre del restaurante'] ?? '—');
      const newLocalNombre = restaurantes.find((r) => r.id === selectedRestauranteId)?.nombreRestaurante ?? selectedRestauranteId;
      const oldSalaLocal = String((reserva.sala as Record<string, unknown> | undefined)?.nombre ?? '—');
      const newSalaLocal = customSalaLocalEnabled ? customSalaLocalNombre : selectedSalaNombre;
      const cambiosLocal: CambioReserva[] = [];
      if (oldLocalNombre !== newLocalNombre)
        cambiosLocal.push({ campo: 'local', label: 'Local', anterior: oldLocalNombre, nuevo: newLocalNombre });
      if (oldSalaLocal !== newSalaLocal)
        cambiosLocal.push({ campo: 'espacio', label: 'Espacio', anterior: oldSalaLocal, nuevo: newSalaLocal });

      let updateResult: { missingEmail?: boolean } | undefined;
      if (customSalaLocalEnabled) {
        if (!customSalaLocalNombre) return;
        updateResult = await ReservaDetalleService.updateReservaRestauranteSala({
          reservaId: reserva.id,
          restauranteId: selectedRestauranteId,
          salaCustom: {
            nombre: customSalaLocalNombre,
            aforoMinimo: typeof customSalaLocalAforoMin === 'number' ? customSalaLocalAforoMin : undefined,
            aforoMaximo: typeof customSalaLocalAforoMax === 'number' ? customSalaLocalAforoMax : undefined,
          },
          cambios: cambiosLocal,
        });
      } else {
        if (!selectedSalaNombre) return;
        updateResult = await ReservaDetalleService.updateReservaRestauranteSala({
          reservaId: reserva.id,
          restauranteId: selectedRestauranteId,
          salaNombre: selectedSalaNombre,
          cambios: cambiosLocal,
        });
      }
      if (updateResult?.missingEmail) {
        setUpdateEmailFailDialog(true);
      }
      await loadAll({ silent: true });
      setLocalDialogOpen(false);
    } finally {
      setSavingLocal(false);
      setConfirmLocalOpen(false);
    }
  };

  const confirmUpdateEspacio = async () => {
    if (!reserva) return;
    const restauranteId = reserva.restaurante?.id || '';
    if (!restauranteId) return;
    setSavingEspacio(true);
    try {
      const oldSalaEspacio = String((reserva.sala as Record<string, unknown> | undefined)?.nombre ?? '—');
      const newSalaEspacio = customSalaEspacioEnabled ? customSalaEspacioNombre : selectedSalaNombre;
      const cambiosEspacio: CambioReserva[] = [];
      if (oldSalaEspacio !== newSalaEspacio)
        cambiosEspacio.push({ campo: 'espacio', label: 'Espacio', anterior: oldSalaEspacio, nuevo: newSalaEspacio });

      let updateResult: { missingEmail?: boolean } | undefined;
      if (customSalaEspacioEnabled) {
        if (!customSalaEspacioNombre) return;
        updateResult = await ReservaDetalleService.updateReservaRestauranteSala({
          reservaId: reserva.id,
          restauranteId,
          salaCustom: {
            nombre: customSalaEspacioNombre,
            aforoMinimo: typeof customSalaEspacioAforoMin === 'number' ? customSalaEspacioAforoMin : undefined,
            aforoMaximo: typeof customSalaEspacioAforoMax === 'number' ? customSalaEspacioAforoMax : undefined,
          },
          cambios: cambiosEspacio,
        });
      } else {
        if (!selectedSalaNombre) return;
        updateResult = await ReservaDetalleService.updateReservaRestauranteSala({
          reservaId: reserva.id,
          restauranteId,
          salaNombre: selectedSalaNombre,
          cambios: cambiosEspacio,
        });
      }
      if (updateResult?.missingEmail) {
        setUpdateEmailFailDialog(true);
      }
      await loadAll({ silent: true });
      setEspacioDialogOpen(false);
    } finally {
      setSavingEspacio(false);
      setConfirmEspacioOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className={variant === 'panel' ? 'h-full bg-slate-50 px-6 py-6' : 'min-h-screen bg-slate-50 px-6 py-8'}>
        <div className="h-8 w-48 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (error || !reserva) {
    return (
      <div className={variant === 'panel' ? 'h-full bg-slate-50 px-6 py-6' : 'min-h-screen bg-slate-50 px-6 py-8'}>
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="py-6 text-sm text-rose-700">{error || 'No se pudo cargar la reserva.'}</CardContent>
        </Card>
      </div>
    );
  }

  const facturasCardNode = (
    <FacturasCard
      facturas={facturas}
      facturasAll={facturasAll}
      leadKomvo={Boolean(reserva.leadKomvo)}
      asistentes={asistencias}
      servicioPagado={servicioPagado ?? null}
      planLabel={planLabel}
      planPriceLabel={planPriceLabel}
      partnerId={AuthService.getCurrentPartnerIdSync()}
      reservaId={reserva?.id ?? null}
      reservaPagado={Boolean(reserva?.pagado)}
      reservaEstado={reserva?.estado ?? null}
      reservaFechaEvento={
        (reserva?.kombo as { Fecha?: string | Date } | undefined)?.Fecha ??
        (reserva?.evento as { 'Fecha del evento'?: string | Date } | undefined)?.['Fecha del evento'] ??
        null
      }
    />
  );

  const asistentesRailNode = (
    <AsistentesCard
      reservaNombre={reserva.usuario?.['Nombre de usuario'] ?? null}
      reservaFecha={(reserva.kombo as { Fecha?: string | Date } | undefined)?.Fecha ?? null}
      reservaEstado={reserva.estado ?? null}
      aforoSolicitadoLabel={aforoSolicitadoLabel}
      stats={asistentesStats}
      alergias={asistencias}
      preguntas={
        (reserva.questions as Array<{ question?: string; question_type?: string; required?: boolean; options?: string[] }> | undefined) ??
        []
      }
      showPaymentStats={false}
      isKomvo={isKomvo}
      reservaId={reserva.id}
      onReload={() => loadAll({ silent: true })}
      layout="split"
    />
  );

  const pagoCardNode =
    reserva.estado?.toLowerCase() !== 'pendiente' &&
    !['completado', 'fallado'].includes((reserva.estado ?? '').toLowerCase()) ? (
      <Card className="gap-1.5 border-none bg-white p-4 shadow-sm">
        <CardContent className="space-y-3 p-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fecha límite</p>
          <p className="text-sm leading-none text-slate-600">
            {reserva.fechaLimitePago ? `Hasta el ${formatDate(reserva.fechaLimitePago)}` : 'Sin fecha'}
          </p>
          {(() => {
            const estado = (reserva.estado ?? '').toLowerCase();
            const canEdit = !['completado', 'fallado', 'expirado'].includes(estado);
            if (!canEdit) return null;

            const tipoCompra = (reserva.tipoCompra ?? '').toLowerCase();
            const canCloseWindow = tipoCompra === 'entradas' && !paymentWindowConcluded;

	            return (
	              <div className="flex w-full gap-2 pt-1">
	                <div className="relative w-full flex-1">
	                  <Button
	                    variant="outline"
	                    size="sm"
	                    className="h-7 w-full justify-center gap-2 px-3"
	                    disabled={savingFechaLimite || !canCloseWindow}
	                    onClick={() => setCloseVentaDialogOpen(true)}
	                  >
	                    <Lock className="h-4 w-4" />
	                    Cerrar plazo
	                  </Button>
	                  {!canCloseWindow && showCerrarPlazoReason && (
	                    <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
	                      La reserva no está en periodo de pago.
	                    </div>
	                  )}
	                  {!canCloseWindow && !savingFechaLimite && (
	                    <button
	                      type="button"
	                      className="absolute inset-0"
	                      aria-label="Ver motivo de bloqueo"
	                      onClick={() => {
	                        setShowCerrarPlazoReason(true);
	                        window.setTimeout(() => setShowCerrarPlazoReason(false), 3000);
	                      }}
	                    />
	                  )}
	                </div>
	                <Button
	                  variant="outline"
	                  size="sm"
	                  className="h-7 w-full flex-1 justify-center gap-2 px-3"
                  onClick={openFechaLimiteDialog}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {(() => {
                    if (tipoCompra !== 'entradas') return 'Editar fecha';
                    return paymentWindowConcluded ? 'Ampliar fecha' : 'Editar fecha';
                  })()}
                </Button>
              </div>
            );
          })()}
          {reserva.estado?.toLowerCase() === 'aceptado' && (
            <p className="text-sm text-slate-600">
              {(() => {
                const tipoCompra = (reserva.tipoCompra ?? '').toLowerCase();
                if (tipoCompra === 'entradas') {
                  return paymentWindowConcluded
                    ? 'El plazo para comprar la parte del plan ha concluido.'
                    : 'El plazo para comprar la parte del plan está abierto.';
                }
                if (isFlexibleNoAnticipo) {
                  return 'Reserva sin anticipo: no requiere pago.';
                }
                return reserva.pagado ? 'El cliente ha pagado la totalidad del plan.' : 'El cliente pagará la totalidad del plan.';
              })()}
            </p>
          )}
        </CardContent>
      </Card>
    ) : null;

  const panelRightRailTarget =
    variant === 'panel' && typeof document !== 'undefined'
      ? document.getElementById('reserva-detail-right-rail')
      : null;

  return (
    <div
      className={
        variant === 'panel'
          ? 'relative h-full overflow-x-hidden overflow-y-auto bg-slate-50 px-6 py-6'
          : 'relative min-h-screen bg-slate-50 px-6 py-8'
      }
    >
      <div className={variant === 'panel' ? 'origin-top-left scale-[0.8] w-[125%]' : ''}>
        <div
          className={
            variant === 'panel'
              ? 'flex w-full flex-col gap-6'
              : 'mx-auto flex w-full max-w-6xl flex-col gap-6'
          }
        >
        <div className="flex items-center justify-between">
          {variant === 'panel' ? (
            <Button variant="outline" className="gap-2" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          ) : (
            <Button variant="outline" onClick={() => history.back()}>
              Volver
            </Button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {reserva.estado?.toLowerCase() === 'pendiente' && (
              <PendienteActionsDialog reserva={reserva} size="lg" onCompleted={() => loadAll({ silent: true })} />
            )}
            {cambioPendiente && (
              <>
                <Button
                  size="sm"
                  className="h-9 px-4 text-sm bg-emerald-500 text-white hover:bg-emerald-500"
                  disabled={savingCambio === 'accept' || savingCambio === 'reject'}
                  onClick={openCambioDialog}
                >
                  {savingCambio === 'accept' ? 'Aceptando...' : 'Aceptar cambio'}
                </Button>
                <Button
                  size="sm"
                  className="h-9 px-4 text-sm bg-rose-500 text-white hover:bg-rose-500"
                  disabled={savingCambio === 'accept' || savingCambio === 'reject'}
                  onClick={() => handleCambioAction('reject')}
                >
                  {savingCambio === 'reject' ? 'Rechazando...' : 'Rechazar'}
                </Button>
              </>
            )}
            {reserva.estado?.toLowerCase() === 'expirado' && (
              <>
                <Button
                  size="sm"
                  className="h-9 px-4 text-sm bg-emerald-500 text-white hover:bg-emerald-500"
                  disabled={savingExpiredAction === 'confirm' || savingExpiredAction === 'cancel'}
                  onClick={() => {
                    setExpiredConfirmAction('confirm');
                    setExpiredConfirmOpen(true);
                  }}
                >
                  {savingExpiredAction === 'confirm' ? 'Confirmando...' : 'Confirmada con cliente'}
                </Button>
                <Button
                  size="sm"
                  className="h-9 px-4 text-sm bg-rose-500 text-white hover:bg-rose-500"
                  disabled={savingExpiredAction === 'confirm' || savingExpiredAction === 'cancel'}
                  onClick={() => {
                    setExpiredConfirmAction('cancel');
                    setExpiredConfirmOpen(true);
                  }}
                >
                  {savingExpiredAction === 'cancel' ? 'Cancelando...' : 'Cancelar definitivamente'}
                </Button>
              </>
            )}
          </div>
        </div>

        <Dialog open={cambioDialogOpen} onOpenChange={setCambioDialogOpen}>
          <DialogContent className="max-w-lg" onOpenAutoFocus={(event) => event.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Confirmar cambio</DialogTitle>
              <DialogDescription>
                Revisa los datos solicitados y define una nueva fecha límite.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {cambioPendiente && cambioSolicitado && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>Fecha: {formatCambioFecha(cambioSolicitado.fechaNueva)}</span>
                    <span>
                      Hora: {formatCambioHora(cambioSolicitado.horaNueva)}
                      {cambioSolicitado.horaFinNueva ? ` - ${formatCambioHora(cambioSolicitado.horaFinNueva)}` : ''}
                    </span>
                    <span>Aforo: {cambioSolicitado.aforoNuevo ?? '—'}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {isFlexibleNoAnticipo ? 'Fecha límite de asistentes' : 'Fecha límite de pago'}
                </label>
                <Input
                  type="date"
                  value={cambioFechaLimite}
                  min={todayISO}
                  onChange={(event) => setCambioFechaLimite(event.target.value)}
                />
                {cambioFechaError && <p className="mt-1 text-xs text-rose-600">{cambioFechaError}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCambioDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-emerald-500 text-white hover:bg-emerald-500"
                onClick={confirmCambio}
              >
                Aceptar cambio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={emailFailDialog} onOpenChange={setEmailFailDialog}>
          <DialogContent className="max-w-md" onOpenAutoFocus={(event) => event.preventDefault()}>
            <DialogHeader>
              <DialogTitle>No se pudo enviar el correo</DialogTitle>
              <DialogDescription>
                El usuario no se había registrado en Komvo, así que no pudimos enviarle el email.
              </DialogDescription>
            </DialogHeader>
            {emailFailMode === 'cancel' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Debes avisar al cliente de que se ha cancelado definitivamente la reserva.
              </div>
            )}
            {emailFailMode === 'confirm' && emailFailLink && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Enlace para compartir:
                <div className="mt-1 break-all text-[#3b3af2]">{emailFailLink}</div>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(emailFailLink);
                      setEmailFailCopied(true);
                      window.setTimeout(() => setEmailFailCopied(false), 2000);
                    }}
                  >
                    {emailFailCopied ? 'Copiado' : 'Copiar enlace'}
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setEmailFailDialog(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

	        <Dialog open={updateEmailFailDialog} onOpenChange={setUpdateEmailFailDialog}>
	          <DialogContent className="max-w-md" onOpenAutoFocus={(event) => event.preventDefault()}>
	            <DialogHeader>
	              <DialogTitle>No se pudo enviar el correo</DialogTitle>
	              <DialogDescription>
	                No encontramos un email del usuario en la reserva ni en la cuenta. Tendrás que avisarle manualmente.
	              </DialogDescription>
	            </DialogHeader>
	            <DialogFooter>
	              <Button onClick={() => setUpdateEmailFailDialog(false)}>Cerrar</Button>
	            </DialogFooter>
	          </DialogContent>
	        </Dialog>

	        {cambioPendiente && cambioSolicitado && (
	          <Card className="gap-4 border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
	            <CardContent className="space-y-4 p-0">
	              <div className="flex items-start justify-between gap-3">
	                <div>
	                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Solicitud de cambio</p>
	                  {cambioSolicitado.fechaSolicitud && (
	                    <p className="text-xs text-slate-500">
	                      Fecha de solicitud: {formatCambioFecha(cambioSolicitado.fechaSolicitud)}
	                    </p>
	                  )}
	                </div>
	              </div>
	              <div className="grid gap-3 text-sm text-slate-700">
	                {(() => {
	                  const blocks: Array<{
	                    label: string;
	                    before: string;
	                    after: string;
	                  }> = [];

	                  const fechaAntes = formatCambioFecha(cambioSolicitado.fechaAnterior);
	                  const fechaDespues = formatCambioFecha(cambioSolicitado.fechaNueva);
	                  if (fechaAntes !== fechaDespues) {
	                    blocks.push({ label: 'Fecha', before: fechaAntes, after: fechaDespues });
	                  }

	                  const horaAntes = `${formatCambioHora(cambioSolicitado.horaAnterior)}${
	                    cambioSolicitado.horaFinAnterior ? ` - ${formatCambioHora(cambioSolicitado.horaFinAnterior)}` : ''
	                  }`;
	                  const horaDespues = `${formatCambioHora(cambioSolicitado.horaNueva)}${
	                    cambioSolicitado.horaFinNueva ? ` - ${formatCambioHora(cambioSolicitado.horaFinNueva)}` : ''
	                  }`;
	                  if (horaAntes !== horaDespues) {
	                    blocks.push({ label: 'Hora', before: horaAntes, after: horaDespues });
	                  }

	                  const aforoAntes = cambioSolicitado.aforoAnterior != null ? String(cambioSolicitado.aforoAnterior) : '—';
	                  const aforoDespues = cambioSolicitado.aforoNuevo != null ? String(cambioSolicitado.aforoNuevo) : '—';
	                  if (aforoAntes !== aforoDespues) {
	                    blocks.push({ label: 'Aforo', before: aforoAntes, after: aforoDespues });
	                  }

	                  if (blocks.length === 0) {
	                    return (
	                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
	                        No hay cambios detectados.
	                      </div>
	                    );
	                  }

	                  return (
	                    <div className="grid gap-3">
	                      {blocks.map((block) => (
	                        <div key={block.label} className="grid grid-cols-2 gap-3">
	                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
	                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
	                              {block.label} anterior
	                            </p>
	                            <p className="text-sm font-semibold text-slate-900">{block.before}</p>
	                          </div>
	                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
	                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
	                              {block.label} nueva
	                            </p>
	                            <p className="text-sm font-semibold text-slate-900">{block.after}</p>
	                          </div>
	                        </div>
	                      ))}
	                    </div>
	                  );
	                })()}
	              </div>
	            </CardContent>
	          </Card>
	        )}

	        {(() => {
	          const manageUrl =
	            WEB_URL && reserva?.id
	              ? isAdhocPack && !reserva.pagado
	                ? `${WEB_URL}/pres/${reserva.id}`
                : !reserva.leadKomvo &&
                    (reserva.estado ?? '').toLowerCase() === 'aceptado' &&
                    !reserva.pagado &&
                    (reserva.tipoCompra ?? '').toLowerCase() !== 'entradas'
                  ? `${WEB_URL}/pres/${reserva.id}`
                  : `${WEB_URL}/plan/${reserva.id}/gestionar`
              : null;
          return (
            <ReservaHeader
              reserva={reserva}
              onEditEvento={openEventoDialog}
              originBadge={originBadge ?? undefined}
              clienteEmail={!isKomvo ? cliente.email : null}
              clienteTelefono={!isKomvo ? cliente.telefono : null}
              manageUrl={manageUrl}
              sendingEmail={sendingManageEmail}
              onSendEmail={() => {
                if (!reserva?.id || !cliente.email) return;
                setSendingManageEmail(true);
                void ReservaDetalleService.sendReservaManageEmail({
                  reservaId: reserva.id,
                  email: cliente.email,
                }).finally(() => setSendingManageEmail(false));
              }}
            />
          );
        })()}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="gap-3 border-none bg-white p-4 shadow-sm">
            <CardContent className="space-y-4 p-0">
              <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Local</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-slate-900">
                    {reserva.restaurante?.['Nombre del restaurante'] || 'Restaurante'}
                  </p>
                  <Button type="button" onClick={openLocalDialog} variant="outline" size="sm" className="gap-2">
                    <Home className="h-4 w-4" />
                    Cambiar local
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Espacio</p>
                <div className="mt-2 flex items-center justify-between gap-3">
	                  <div>
	                    <p className="text-base font-semibold text-slate-900">
	                      {(reserva.sala as { nombre?: string } | null | undefined)?.nombre || 'Sin sala asignada'}
	                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Aforo{' '}
                      {((reserva.sala as { aforoMinimo?: number | null } | null | undefined)?.aforoMinimo ?? null) !== null
                        ? (reserva.sala as { aforoMinimo?: number | null } | null | undefined)?.aforoMinimo
                        : '—'}{' '}
                      -{' '}
                      {((reserva.sala as { aforoMaximo?: number | null } | null | undefined)?.aforoMaximo ?? null) !== null
                        ? (reserva.sala as { aforoMaximo?: number | null } | null | undefined)?.aforoMaximo
                        : '—'}{' '}
                      pax
                    </p>
                  </div>
                  <Button type="button" onClick={openEspacioDialog} variant="outline" size="sm" className="gap-2">
                    <DoorOpen className="h-4 w-4" />
                    Cambiar espacio
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-3 border-none bg-white p-4 shadow-sm">
            <CardContent className="space-y-4 p-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Responsable de la reserva</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-slate-900">
                    {responsables.find((item) => item.id === responsableId)?.nombre || 'Equipo sin asignar'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={savingResponsableQuick}
                    onClick={() => {
                      setResponsableQuickDraft(responsableId);
                      setResponsableQuickOpen(true);
                    }}
                  >
                    <UserCheck className="h-4 w-4" />
                    Cambiar responsable
                  </Button>
                </div>
              </div>

              <div>
	                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Canal de la reserva</p>
	                <div className="mt-2 flex items-center justify-between gap-3">
	                  <p className="text-base font-semibold text-slate-900">
	                    {reserva.leadKomvo === true ? 'Komvo' : canalDraft || 'Sin canal'}
	                  </p>
	                  <div className="relative">
	                    <Button
	                      type="button"
	                      variant="outline"
	                      size="sm"
	                      className="gap-2"
	                      disabled={savingCanalQuick || reserva.leadKomvo === true}
	                      onClick={() => {
	                        setCanalQuickDraft(canalDraft);
	                        setCanalQuickOpen(true);
	                      }}
	                    >
	                      <Tag className="h-4 w-4" />
	                      Cambiar canal
	                    </Button>
	                    {reserva.leadKomvo === true && showCanalLockedReason && (
	                      <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
	                        El canal es Komvo y no se puede cambiar.
	                      </div>
	                    )}
	                    {reserva.leadKomvo === true && !savingCanalQuick && (
	                      <button
	                        type="button"
	                        className="absolute inset-0"
	                        aria-label="Ver motivo de bloqueo"
	                        onClick={() => {
	                          setShowCanalLockedReason(true);
	                          window.setTimeout(() => setShowCanalLockedReason(false), 3000);
	                        }}
	                      />
	                    )}
	                  </div>
	                </div>
	              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog
          open={responsableQuickOpen}
          onOpenChange={(open) => {
            setResponsableQuickOpen(open);
            if (open) setResponsableQuickDraft(responsableId);
          }}
        >
          <DialogContent className="max-w-md" onOpenAutoFocus={(event) => event.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Cambiar responsable</DialogTitle>
              <DialogDescription>Solo afecta a la gestión interna del local.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {[{ id: '', nombre: 'Equipo sin asignar', role: undefined as string | undefined }, ...responsables].map((item) => {
                const isSelected = responsableQuickDraft === item.id;
                const initials = item.nombre.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-[#7472fd] bg-[rgba(116,114,253,0.06)]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    onClick={() => setResponsableQuickDraft(item.id)}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isSelected ? 'bg-[#7472fd] text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.id ? initials : '—'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${isSelected ? 'text-[#7472fd]' : 'text-slate-900'}`}>{item.nombre}</p>
                      {item.role && <p className="truncate text-xs text-slate-400">{item.role}</p>}
                    </div>
                    {isSelected && (
                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#7472fd] bg-[#7472fd]" />
                    )}
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResponsableQuickOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-[#7472FD] text-white hover:bg-[#5f5bf2]"
                disabled={savingResponsableQuick}
                onClick={() => {
                  if (!reserva?.id) return;
                  setSavingResponsableQuick(true);
                  void (async () => {
                    try {
                      const selected = responsables.find((item) => item.id === responsableQuickDraft) ?? null;
                      await ReservaDetalleService.updateReservaResponsable({
                        reservaId: reserva.id,
                        responsableEquipo: selected
                          ? {
                              id: selected.id,
                              nombre: selected.nombre,
                              email: selected.email ?? undefined,
                              role: selected.role ?? undefined,
                            }
                          : null,
                      });
                      setResponsableId(responsableQuickDraft);
                      await loadAll({ silent: true });
                      setResponsableQuickOpen(false);
                    } finally {
                      setSavingResponsableQuick(false);
                    }
                  })();
                }}
              >
                {savingResponsableQuick ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={canalQuickOpen}
          onOpenChange={(open) => {
            setCanalQuickOpen(open);
            if (open) setCanalQuickDraft(canalDraft);
          }}
        >
          <DialogContent className="max-w-md" onOpenAutoFocus={(event) => event.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Cambiar canal</DialogTitle>
              <DialogDescription>Solo afecta a la gestión interna del local.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {[{ name: '', color: '#94a3b8' }, ...channels].map((item) => {
                const isSelected = canalQuickDraft === item.name;
                const label = item.name || 'Sin canal';
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-[#7472fd] bg-[rgba(116,114,253,0.06)]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    onClick={() => setCanalQuickDraft(item.name)}
                  >
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.name ? item.color : '#cbd5e1' }}
                    />
                    <p className={`flex-1 truncate text-sm font-medium ${isSelected ? 'text-[#7472fd]' : 'text-slate-900'}`}>
                      {label}
                    </p>
                    {isSelected && (
                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#7472fd] bg-[#7472fd]" />
                    )}
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCanalQuickOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-[#7472FD] text-white hover:bg-[#5f5bf2]"
                disabled={savingCanalQuick}
                onClick={() => {
                  if (!reserva?.id) return;
                  setSavingCanalQuick(true);
                  void (async () => {
                    try {
                      await ReservaDetalleService.updateReservaCanal({
                        reservaId: reserva.id,
                        canal: canalQuickDraft ? canalQuickDraft : null,
                      });
                      setCanalDraft(canalQuickDraft);
                      await loadAll({ silent: true });
                      setCanalQuickOpen(false);
                    } finally {
                      setSavingCanalQuick(false);
                    }
                  })();
                }}
              >
                {savingCanalQuick ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

	        <div className="grid gap-6 lg:grid-cols-2">
	          <div className="space-y-6">
	            <NotasEtiquetasCard
	              reservaId={reserva.id}
	              notasRaw={reserva.notasReserva ?? []}
              etiquetasRaw={reserva.etiquetas ?? []}
              onReload={() => loadAll({ silent: true })}
            />
            {variant === 'panel' ? (
              <div className="lg:hidden">
                <AsistentesCard
                  reservaNombre={reserva.usuario?.['Nombre de usuario'] ?? null}
                  reservaFecha={(reserva.kombo as { Fecha?: string | Date } | undefined)?.Fecha ?? null}
                  reservaEstado={reserva.estado ?? null}
                  aforoSolicitadoLabel={aforoSolicitadoLabel}
                  stats={asistentesStats}
                  alergias={asistencias}
                  preguntas={
                    (reserva.questions as Array<{ question?: string; question_type?: string; required?: boolean; options?: string[] }> | undefined) ??
                    []
                  }
                  showPaymentStats={false}
                  isKomvo={isKomvo}
                  reservaId={reserva.id}
                  onReload={() => loadAll({ silent: true })}
                />
              </div>
            ) : (
              <AsistentesCard
                reservaNombre={reserva.usuario?.['Nombre de usuario'] ?? null}
                reservaFecha={(reserva.kombo as { Fecha?: string | Date } | undefined)?.Fecha ?? null}
                reservaEstado={reserva.estado ?? null}
                aforoSolicitadoLabel={aforoSolicitadoLabel}
                stats={asistentesStats}
                alergias={asistencias}
                preguntas={
                  (reserva.questions as Array<{ question?: string; question_type?: string; required?: boolean; options?: string[] }> | undefined) ??
                  []
                }
                showPaymentStats={false}
                isKomvo={isKomvo}
                reservaId={reserva.id}
                onReload={() => loadAll({ silent: true })}
              />
            )}
	            {variant === 'panel' ? <div className="lg:hidden">{facturasCardNode}</div> : facturasCardNode}
	          </div>

	          <div className="space-y-6">
	            <Card className="gap-3 border-none bg-white p-4 shadow-sm">
	              <CardContent className="space-y-3 p-0">
	                <div className="flex items-start justify-between gap-3">
	                  <div>
	                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Plan</p>
                    <p className="text-base font-semibold text-slate-900">
                      {planMainLabelForCard}
                    </p>
                    {!packEditAvailability.canEdit && (
                      <p className="mt-2 text-xs font-medium text-amber-600">{packEditAvailability.reason}</p>
                    )}
                  </div>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!packEditAvailability.canEdit}
                      onClick={openPackDialog}
                    >
                      <PackageIcon className="h-4 w-4" />
                      Editar plan
                    </Button>
                    {!packEditAvailability.canEdit && showPackEditReason && (
                      <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                        No se puede editar el plan. {packEditAvailability.reason}
                      </div>
                    )}
                    {!packEditAvailability.canEdit && (
                      <button
                        type="button"
                        className="absolute inset-0"
                        aria-label="Ver motivo de bloqueo"
                        onClick={() => {
                          setShowPackEditReason(true);
                          window.setTimeout(() => setShowPackEditReason(false), 3000);
                        }}
                      />
                    )}
                  </div>
                </div>
                {isAdhocPack ? (
                  (() => {
                    if (!adhocItems.length) return null;
                    const totalValue =
                      typeof adhocSnapshot?.total === 'number'
                        ? adhocSnapshot.total
                        : typeof adhocSnapshot?.total_cents === 'number'
                        ? adhocSnapshot.total_cents / 100
                        : null;
                    return (
                      <div className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Detalle solicitado
                        </p>
                        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                          {adhocItems.map((item, index) => {
                            const name = String(item?.name ?? item?.nombre ?? 'Elemento');
                            const quantity = Number(item?.cantidad ?? item?.quantity ?? 0);
                            const unit = Number(item?.precio_unitario ?? item?.unit_price ?? item?.precio ?? 0);
                            const itemTotal =
                              Number(item?.total ?? 0) || (Number.isFinite(quantity * unit) ? quantity * unit : 0);
                            const tipo =
                              typeof item?.tipo === 'string' && item.tipo.toLowerCase() === 'comida' ? 'Comida' : 'Bebida';
                            return (
                              <div
                                key={`${name}-${index}`}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{name}</p>
                                    <p className="text-xs text-slate-500">
                                      {tipo} · {quantity} x {unit.toFixed(2)}€
                                    </p>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {itemTotal.toFixed(2)}€
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {totalValue != null && (
                          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total</p>
                            <p className="text-sm font-semibold text-slate-900">{totalValue.toFixed(2)}€</p>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    if (servicioPagado && servicioPagadoItems.length > 0) {
                      return (
                        <div className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Detalle pagado
                          </p>
                          <div className="space-y-2">
                            {servicioPagadoItems.map((item, index) => (
                              <div
                                key={`${item.name}-${index}`}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                              >
	                                <div className="flex items-center justify-between gap-3">
	                                  <div>
	                                    <div className="flex items-center gap-2">
	                                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
	                                      {servicioPagadoLabel.toLowerCase() === 'barra libre' && barraTiempoSolicitado ? (
	                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
	                                          {barraTiempoSolicitado}
	                                        </span>
	                                      ) : null}
	                                    </div>
	                                    {item.quantity > 0 && (
	                                      <p className="text-xs text-slate-500">
                                        {(() => {
                                          const isTickets = servicioPagadoLabel.toLowerCase() === 'tickets';
                                          const unitCents =
                                            typeof item.total === 'number' && item.quantity > 0
                                              ? item.total / item.quantity
                                              : null;
                                          if (isTickets && typeof unitCents === 'number') {
                                            return `${item.quantity} ud x ${(unitCents / 100).toFixed(2)}€`;
                                          }
                                          return `${servicioPagadoLabel} · ${item.quantity} ${
                                            servicioPagadoIsPerPerson ? 'personas' : 'ud'
                                          }`;
                                        })()}
                                      </p>
                                    )}
                                  </div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {(() => {
                                      if (typeof item.total !== 'number') return '—';
                                      const unitCents =
                                        item.quantity > 0 ? item.total / item.quantity : null;
                                      if (servicioPagadoIsPerPerson && typeof unitCents === 'number') {
                                        return `${(unitCents / 100).toFixed(2)}€ / persona`;
                                      }
                                      return `${(item.total / 100).toFixed(2)}€`;
                                    })()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {typeof servicioPagadoTotalCents === 'number' && (
                            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {(servicioPagadoTotalCents / 100).toFixed(2)}€
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }
                    const ticketItems = precioTickets.filter((ticket) => {
                      const name = String(ticket.ticket ?? '').trim();
                      const price = ticket.price;
                    const qty = ticket.quantity;
                    return name || price != null || qty != null;
                  });
                  const hasMenu = Boolean(getStringField(precioMenu, 'Nombre') || getNumberField(precioMenu, 'Precio') != null);
                  const hasCocktail = Boolean(getStringField(precioCocktail, 'Nombre') || getNumberField(precioCocktail, 'Precio') != null);
                  const hasBarra = Boolean(
                    getStringField(precioBarra, 'Nombre') ||
                      getNumberField(precioBarra, 'Precio') != null ||
                      Boolean(precioBarra?.intervaloSeleccionado)
                  );
                  const hasAnticipo = Boolean(getNumberField(precioAnticipo, 'Precio') != null || getStringField(precioAnticipo, 'Descripción'));
                  const hasAny = hasAnticipo || hasMenu || hasCocktail || hasBarra || ticketItems.length > 0;
                  if (!hasAny) return null;
	                  const detailRows: Array<{
	                    key: string;
	                    title: string;
	                    meta?: string;
	                    subtitle?: string;
	                    price?: string;
	                  }> = [];
	                  const addRow = (key: string, title: string, subtitle?: string, price?: string, meta?: string) => {
	                    detailRows.push({ key, title, subtitle, price, meta });
	                  };
                  if (hasAnticipo) {
                    const desc = getStringField(precioAnticipo, 'Descripción');
                    const priceValue = getNumberField(precioAnticipo, 'Precio');
                    addRow(
                      'anticipo',
                      desc || 'Anticipo',
                      undefined,
                      priceValue != null ? `${Number(priceValue).toFixed(2)}€ / persona` : undefined
                    );
                  }
                  if (hasMenu) {
                    const name = getStringField(precioMenu, 'Nombre');
                    const priceValue = getNumberField(precioMenu, 'Precio');
                    addRow(
                      'menu',
                      name || 'Menú',
                      undefined,
                      priceValue != null ? `${Number(priceValue).toFixed(2)}€ / persona` : undefined
                    );
                  }
                  if (hasCocktail) {
                    const name = getStringField(precioCocktail, 'Nombre');
                    const priceValue = getNumberField(precioCocktail, 'Precio');
                    addRow(
                      'cocktail',
                      name || 'Cocktail',
                      undefined,
                      priceValue != null ? `${Number(priceValue).toFixed(2)}€ / persona` : undefined
                    );
                  }
	                  if (hasBarra) {
	                    const name = getStringField(precioBarra, 'Nombre');
	                    const priceValue = getNumberField(precioBarra, 'Precio');
	                    const duration = Boolean(precioBarra?.intervaloSeleccionado)
	                      ? String(((precioBarra?.intervaloSeleccionado as Record<string, unknown>)?.duracionMin ?? '')).trim()
	                      : '';
	                    const tiempoLabel = barraTiempoSolicitado ?? (duration ? duration : null);
	                    addRow(
	                      'barra',
	                      name || 'Barra libre',
	                      undefined,
	                      priceValue != null ? `${Number(priceValue).toFixed(2)}€ / persona` : undefined,
	                      tiempoLabel ?? undefined
	                    );
	                  }
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Detalle solicitado
                        </p>
                        {ticketItems.length > 0 ? (
                          <p className="text-xs text-slate-500">{ticketItems.length} tipos</p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        {detailRows.map((row) => (
                          <div
                            key={row.key}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                          >
                            <div>
	                              <div className="flex items-center gap-2">
	                                <p className="text-sm font-semibold text-slate-900">{row.title}</p>
	                                {row.meta ? (
	                                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
	                                    {row.meta}
	                                  </span>
	                                ) : null}
	                                {row.key === 'menu' && menuPreview.description ? (
	                                  <button
	                                    type="button"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                    aria-label="Ver menú"
                                    onClick={() => setMenuPreviewOpen(true)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                ) : null}
                              </div>
                              {row.subtitle ? (
                                <p className="text-xs text-slate-500">{row.subtitle}</p>
                              ) : null}
                            </div>
                            {row.price ? (
                              <p className="text-sm font-semibold text-slate-900">{row.price}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {ticketItems.length > 0 && (
                        <div className="space-y-2">
                          {ticketItems.map((ticket, index) => {
                            const quantity = Number(ticket.quantity ?? 0);
                            const price = Number(ticket.price ?? 0);
                            const total = quantity * price;
                            return (
                              <div
                                key={`${ticket.ticket ?? 'ticket'}-${index}`}
                                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {String(ticket.ticket ?? 'Ticket')}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {String(ticket.quantity ?? 0)} uds · {Number(ticket.price ?? 0).toFixed(2)}€
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{total.toFixed(2)}€</p>
                              </div>
                            );
                          })}
                          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {ticketItems
                                .reduce(
                                  (sum, ticket) => sum + Number(ticket.quantity ?? 0) * Number(ticket.price ?? 0),
                                  0
                                )
                                .toFixed(2)}
                              €
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  })()
                )}
              </CardContent>
            </Card>

            <Dialog open={menuPreviewOpen} onOpenChange={setMenuPreviewOpen}>
              <DialogContent className="max-w-lg" onOpenAutoFocus={(event) => event.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>{menuPreview.title}</DialogTitle>
                  {menuPreview.price ? (
                    <DialogDescription>{menuPreview.price}</DialogDescription>
                  ) : null}
                </DialogHeader>
                <div className="text-sm text-slate-700 whitespace-pre-line">
                  {menuPreview.description || 'Sin descripción.'}
                </div>
              </DialogContent>
            </Dialog>

            {variant === 'panel' ? <div className="lg:hidden">{pagoCardNode}</div> : pagoCardNode}
          </div>
        </div>
      </div>
      <Dialog open={localDialogOpen} onOpenChange={setLocalDialogOpen}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Cambiar local</DialogTitle>
            <DialogDescription>
              Actualmente:{' '}
	              <span className="font-medium text-slate-700">
	                {String((reserva?.restaurante as Record<string, unknown> | undefined)?.['Nombre del restaurante'] ?? '—')}
	                {Boolean(reserva?.sala)
	                  ? ` · ${String((reserva?.sala as Record<string, unknown> | undefined)?.nombre ?? '')}`
	                  : null}
	              </span>
	            </DialogDescription>
	          </DialogHeader>
          <RestauranteSalaSection
            restaurantes={restaurantes}
            salas={restauranteDetalle?.salas ?? []}
            restauranteId={selectedRestauranteId}
            salaId={selectedSalaNombre}
            salaFallback={{
              aforoMinimo: (reserva?.sala as { aforoMinimo?: number } | null | undefined)?.aforoMinimo,
              aforoMaximo: (reserva?.sala as { aforoMaximo?: number } | null | undefined)?.aforoMaximo,
            }}
            onRestauranteChange={handleRestauranteChange}
            onSalaChange={setSelectedSalaNombre}
          />
          <div className="mt-3">
            <button
              type="button"
              className="text-xs font-semibold text-[#3b3af2] underline underline-offset-2"
              onClick={() => setCustomSalaLocalEnabled((prev) => !prev)}
            >
              {customSalaLocalEnabled ? 'Usar espacio del restaurante' : '¿Quieres poner un espacio personalizado?'}
            </button>
          </div>
          {customSalaLocalEnabled && (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3">
                <label className="text-sm font-medium text-slate-700">Nombre del espacio</label>
                <Input
                  value={customSalaLocalNombre}
                  onChange={(event) => setCustomSalaLocalNombre(event.target.value)}
                  placeholder="Espacio personalizado"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Aforo mínimo</label>
                <NumberInput
                  value={typeof customSalaLocalAforoMin === 'number' ? customSalaLocalAforoMin : null}
                  onChangeValue={(value) => setCustomSalaLocalAforoMin(value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Aforo máximo</label>
                <NumberInput
                  value={typeof customSalaLocalAforoMax === 'number' ? customSalaLocalAforoMax : null}
                  onChangeValue={(value) => setCustomSalaLocalAforoMax(value)}
                />
              </div>
            </div>
          )}
          {loadingRestaurantes && (
            <p className="text-xs text-slate-500">Cargando locales...</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#7472FD] text-white hover:bg-[#5f5bf2]"
              disabled={
                !selectedRestauranteId ||
                savingLocal ||
                (customSalaLocalEnabled ? !customSalaLocalNombre : !selectedSalaNombre)
              }
              onClick={() => setConfirmLocalOpen(true)}
            >
              {savingLocal ? 'Guardando...' : 'Guardar cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fechaLimiteDialogOpen} onOpenChange={setFechaLimiteDialogOpen}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Editar fecha límite de pago</DialogTitle>
            <DialogDescription>Selecciona la nueva fecha límite.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="date"
              value={fechaLimiteDraft}
              min={todayIso}
              max={fechaEvento || undefined}
              onChange={(event) => {
                setFechaLimiteDraft(event.target.value);
                setFechaLimiteMessage(null);
              }}
            />
            {fechaLimiteMessage && <p className="text-xs text-slate-500">{fechaLimiteMessage}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFechaLimiteDraft(toInputDate(reserva?.fechaLimitePago ?? ''));
                setFechaLimiteMessage(null);
                setFechaLimiteDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
              disabled={!fechaLimiteDraft || savingFechaLimite}
              onClick={async () => {
                if (!reserva || !fechaLimiteDraft) return;
                if (fechaLimiteDraft < todayIso) {
                  setFechaLimiteMessage('La fecha límite no puede ser anterior a la fecha actual.');
                  return;
                }
                if (fechaEvento && fechaLimiteDraft > fechaEvento) {
                  setFechaLimiteMessage('La fecha límite no puede ser posterior a la fecha del evento.');
                  return;
                }
                setSavingFechaLimite(true);
                try {
                  const oldFechaLimite = reserva.fechaLimitePago ?? '';
                  const cambiosFecha: CambioReserva[] = [];
                  if (oldFechaLimite !== fechaLimiteDraft)
                    cambiosFecha.push({ campo: 'fechaLimite', label: 'Fecha límite de pago', anterior: oldFechaLimite || 'Sin fecha', nuevo: fechaLimiteDraft });
                  const result = await ReservaDetalleService.updateFechaLimitePago({
                    reservaId: reserva.id,
                    fechaLimitePago: fechaLimiteDraft,
                    usuarioId: reserva.usuario?.id,
                    usuarioEmail: reserva.usuario?.Email ?? null,
                    cambios: cambiosFecha,
                  });
                  if (result.missingUser || result.missingEmail) {
                    setFechaLimiteMessage(
                      'Esta reserva no tiene usuario asociado o email. Debes avisar manualmente al cliente.'
                    );
                  } else {
                    setFechaLimiteMessage('Fecha límite actualizada. Email enviado al cliente.');
                  }
                  await loadAll({ silent: true });
                  setFechaLimiteDialogOpen(false);
                } finally {
                  setSavingFechaLimite(false);
                }
              }}
            >
              {savingFechaLimite ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={closeVentaDialogOpen} onOpenChange={setCloseVentaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar plazo de compra</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrará la venta de entradas estableciendo la fecha límite en el día anterior al actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!reserva?.id) return;
                setSavingFechaLimite(true);
                try {
                  const oldFechaLimiteCierre = reserva.fechaLimitePago ?? '';
                  const cambiosCierre: CambioReserva[] = [
                    { campo: 'fechaLimite', label: 'Fecha límite de pago', anterior: oldFechaLimiteCierre || 'Sin fecha', nuevo: yesterdayIso },
                  ];
                  const result = await ReservaDetalleService.updateFechaLimitePago({
                    reservaId: reserva.id,
                    fechaLimitePago: yesterdayIso,
                    usuarioId: reserva.usuario?.id,
                    usuarioEmail: reserva.usuario?.Email ?? null,
                    cambios: cambiosCierre,
                  });
                  if (result.missingUser || result.missingEmail) {
                    setFechaLimiteMessage(
                      'Esta reserva no tiene usuario asociado o email. Debes avisar manualmente al cliente.'
                    );
                  }
                  await loadAll({ silent: true });
                } finally {
                  setSavingFechaLimite(false);
                }
              }}
            >
              Confirmar cierre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={expiredConfirmOpen} onOpenChange={setExpiredConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {expiredConfirmAction === 'confirm'
                ? 'Confirmar reserva con el cliente'
                : 'Cancelar definitivamente la reserva'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {expiredConfirmAction === 'confirm'
                ? 'La reserva pasará a estado aceptado y se notificará al cliente.'
                : 'La reserva pasará a estado fallado y se notificará al cliente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!expiredConfirmAction) return;
                await handleExpiredAction(expiredConfirmAction);
                setExpiredConfirmOpen(false);
                setExpiredConfirmAction(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelLocalOpen} onOpenChange={setCancelLocalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva</AlertDialogTitle>
            <AlertDialogDescription>
              La reserva pasará a estado fallado y se notificará al cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!reserva?.id) return;
                setSavingCancelLocal(true);
                try {
                  await ReservaDetalleService.cancelarReservaLocal({ reservaId: reserva.id });
                  await loadAll({ silent: true });
                  setCancelLocalOpen(false);
                } finally {
                  setSavingCancelLocal(false);
                }
              }}
            >
              Confirmar cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLocalOpen} onOpenChange={setConfirmLocalOpen}>
        <AlertDialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio de local</AlertDialogTitle>
            <AlertDialogDescription>
              Este cambio actualizará el restaurante y el espacio de la reserva. ¿Quieres continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpdateLocal}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={espacioDialogOpen} onOpenChange={setEspacioDialogOpen}>
        <DialogContent className="max-w-xl" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              Cambia el espacio de la reserva en{' '}
              <span className="font-semibold text-slate-900">
                {reserva.restaurante?.['Nombre del restaurante'] || 'Restaurante'}
              </span>
            </DialogTitle>
            <DialogDescription>Selecciona el espacio para esta reserva.</DialogDescription>
          </DialogHeader>
          <div>
            {!restauranteDetalle?.salas?.length ? (
              <p className="text-xs text-slate-500">Este restaurante no tiene espacios configurados.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(() => {
                  const salas = restauranteDetalle?.salas ?? [];
                  const hasSelected = selectedSalaNombre && salas.some((sala) => sala.nombre === selectedSalaNombre);
                  const fallbackSala = !hasSelected && selectedSalaNombre
                    ? {
                        nombre: selectedSalaNombre,
                        aforoMinimo: (reserva?.sala as { aforoMinimo?: number } | null | undefined)?.aforoMinimo ?? 0,
                        aforoMaximo: (reserva?.sala as { aforoMaximo?: number } | null | undefined)?.aforoMaximo ?? 0,
                      }
                    : null;
                  const options = fallbackSala ? [fallbackSala, ...salas] : salas;
                  return options.map((sala) => {
                    const isSelected = selectedSalaNombre === sala.nombre;
                    return (
                      <button
                        key={sala.nombre}
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? 'border-[#7472fd] bg-[rgba(116,114,253,0.06)]'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedSalaNombre(sala.nombre)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${isSelected ? 'text-[#7472fd]' : 'text-slate-900'}`}>
                            {sala.nombre}
                          </p>
                          <p className="text-xs text-slate-400">
                            {sala.aforoMinimo ?? 0} – {sala.aforoMaximo ?? 0} pax
                          </p>
                        </div>
                        {isSelected && (
                          <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#7472fd] bg-[#7472fd]" />
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>
          <div className="mt-3">
            <button
              type="button"
              className="text-xs font-semibold text-[#3b3af2] underline underline-offset-2"
              onClick={() => setCustomSalaEspacioEnabled((prev) => !prev)}
            >
              {customSalaEspacioEnabled ? 'Usar espacio del restaurante' : '¿Quieres poner un espacio personalizado?'}
            </button>
          </div>
          {customSalaEspacioEnabled && (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3">
                <label className="text-sm font-medium text-slate-700">Nombre del espacio</label>
                <Input
                  value={customSalaEspacioNombre}
                  onChange={(event) => setCustomSalaEspacioNombre(event.target.value)}
                  placeholder="Espacio personalizado"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Aforo mínimo</label>
                <NumberInput
                  value={typeof customSalaEspacioAforoMin === 'number' ? customSalaEspacioAforoMin : null}
                  onChangeValue={(value) => setCustomSalaEspacioAforoMin(value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Aforo máximo</label>
                <NumberInput
                  value={typeof customSalaEspacioAforoMax === 'number' ? customSalaEspacioAforoMax : null}
                  onChangeValue={(value) => setCustomSalaEspacioAforoMax(value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEspacioDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#7472FD] text-white hover:bg-[#5f5bf2]"
              disabled={savingEspacio || (customSalaEspacioEnabled ? !customSalaEspacioNombre : !selectedSalaNombre)}
              onClick={() => setConfirmEspacioOpen(true)}
            >
              {savingEspacio ? 'Guardando...' : 'Guardar cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={eventoDialogOpen} onOpenChange={setEventoDialogOpen}>
        <DialogContent
          className="max-w-2xl p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Editar reserva</DialogTitle>
            <DialogDescription>Actualiza fecha, hora y aforo de la reserva.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 pb-6 pt-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Datos de la reserva</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Fecha</label>
                  <Input
                    type="date"
                    value={eventoFecha}
                    inputMode="none"
                    onKeyDown={(e) => {
                      if (e.key !== 'Tab') e.preventDefault();
                    }}
                    onPaste={(e) => e.preventDefault()}
                    onChange={(e) => setEventoFecha(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Hora inicio</label>
                  <Input type="time" value={eventoHora} onChange={(e) => setEventoHora(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Hora fin</label>
                  <Input type="time" value={eventoHoraFin} onChange={(e) => setEventoHoraFin(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Aforo mínimo</label>
                  <NumberInput
                    min={0}
                    value={
                      typeof eventoAforoMin === 'number'
                        ? eventoAforoMin
                        : Number.isNaN(Number(eventoAforoMin))
                          ? null
                          : Number(eventoAforoMin)
                    }
                    onChangeValue={(value) => setEventoAforoMin(value == null ? '' : String(value))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Aforo máximo</label>
                  <NumberInput
                    min={0}
                    value={
                      typeof eventoAforoMax === 'number'
                        ? eventoAforoMax
                        : Number.isNaN(Number(eventoAforoMax))
                          ? null
                          : Number(eventoAforoMax)
                    }
                    onChangeValue={(value) => setEventoAforoMax(value == null ? '' : String(value))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Acciones rápidas</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 justify-center gap-2 text-xs"
                  onClick={() => {
                    setEventoDialogOpen(false);
                    if (reserva) {
                      const currentSalaNombre = (reserva.sala as { nombre?: string } | null | undefined)?.nombre ?? '';
                      setSelectedRestauranteId(reserva.restaurante?.id ?? '');
                      setSelectedSalaNombre(currentSalaNombre);
                      if (reserva.restaurante?.id) {
                        const restId = reserva.restaurante.id;
                        void (async () => {
                          const detalle = await loadRestauranteDetalle(restId);
                          if (currentSalaNombre && detalle?.salas?.length) {
                            const hasSala = detalle.salas.some((sala) => sala.nombre === currentSalaNombre);
                            if (!hasSala) {
                              setSelectedSalaNombre(currentSalaNombre);
                            }
                          }
                        })();
                      }
                      if (!restaurantes.length && reserva.partnerId) {
                        void loadRestaurantes(reserva.partnerId);
                      }
                    }
                    setLocalDialogOpen(true);
                  }}
                >
                  <Home className="h-4 w-4" />
                  Cambiar local
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 justify-center gap-2 text-xs"
                  onClick={() => {
                    setEventoDialogOpen(false);
                    if (reserva) {
                      setSelectedSalaNombre((reserva.sala as { nombre?: string } | null | undefined)?.nombre ?? '');
                    }
                    setEspacioDialogOpen(true);
                  }}
                >
                  <DoorOpen className="h-4 w-4" />
                  Cambiar espacio
                </Button>
                {reserva &&
                  (reserva.estado ?? '').toLowerCase() !== 'pendiente' &&
                  !['completado', 'fallado'].includes((reserva.estado ?? '').toLowerCase()) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 justify-center gap-2 text-xs"
                      onClick={() => {
                        setEventoDialogOpen(false);
                        setFechaLimiteDialogOpen(true);
                      }}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      Editar fecha límite
                    </Button>
                  )}
              </div>
            </div>

            {canCancelReserva ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                <p className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                  Cancelación
                </p>
                <Button
                  variant="outline"
                  className="mt-2 h-9 w-full border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
                  onClick={() => setCancelLocalOpen(true)}
                  disabled={savingCancelLocal}
                >
                  Cancelar reserva
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
            <Button variant="outline" onClick={() => setEventoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#7472FD] text-white hover:bg-[#5f5bf2]"
              onClick={saveEvento}
              disabled={savingEvento}
            >
              {savingEvento ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmEspacioOpen} onOpenChange={setConfirmEspacioOpen}>
        <AlertDialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio de espacio</AlertDialogTitle>
            <AlertDialogDescription>
              Este cambio actualizará el espacio de la reserva. ¿Quieres continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpdateEspacio}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {packDialogOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-komvo-modal="true">
                <div
                  className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                  ref={packDialogRef}
                  tabIndex={-1}
                >
                  <div className="px-6 pt-6">
                  <DialogHeader>
                    <DialogTitle>Editar plan</DialogTitle>
                    <DialogDescription>Selecciona el plan y ajusta el contenido para esta reserva.</DialogDescription>
                  </DialogHeader>
                </div>
                <div className="max-h-[80vh] flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Plan</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={selectedPackId}
                      onChange={(event) => {
                        setSelectedPackId(event.target.value);
                        setSelectedPack(null);
                        setSelectedElement(null);
                        setSelectedInterval(null);
                        setSelectedTickets([]);
                        setElements([]);
                        setPackDialogInitialized(false);
                        setAnticipoActivo(false);
                        setAnticipoDescripcion('');
                        setAnticipoPrecio(0);
                        if (event.target.value !== 'adhoc') {
                          setAdhocEditItems([]);
                        }
                      }}
                    >
                      <option value="">Selecciona un plan</option>
                      {validPacksForRestaurante.map((pack) => (
                        <option key={pack.id} value={pack.id}>
                          {pack['Nombre del pack'] || pack.Categoria || 'Plan'}
                        </option>
                      ))}
                      {isAdhocPack && <option value="adhoc">Presupuesto personalizado</option>}
                      {canUseSinCompra && (
                        <>
                          <option value="sin_compra_anticipada">Consumo libre en el local</option>
                          <option value="anticipo_por_persona">Anticipo por persona</option>
                        </>
                      )}
                    </select>
                    {!loadingPacks && validPacksForRestaurante.length === 0 && (
                      <p className="mt-2 text-xs text-slate-500">No hay planes disponibles para este local.</p>
                    )}
                    {loadingPacks && <p className="mt-2 text-xs text-slate-500">Cargando planes...</p>}
                    {!allowSinCompra && !allowSinCompraOverride && (
                      <div className="mt-2 space-y-2 text-xs text-slate-500">
                        <p>
                          Para habilitar “Consumo libre en el local” o “Anticipo por persona” debes{' '}
                          <button
                            type="button"
                            className="font-medium text-[#3b3af2] underline underline-offset-2"
                            onClick={() => setConfirmSinCompraOpen(true)}
                          >
                            permitirlo en el espacio
                          </button>
                          .
                        </p>
                      </div>
                    )}
                    {allowSinCompraOverride && !allowSinCompra && (
                      <div className="mt-2 space-y-1 text-xs text-emerald-600">
                        <p className="font-medium">
                          Habilitado consumo libre en el local y anticipo por persona para esta reserva.
                        </p>
                        {selectedPackId === 'sin_compra_anticipada' && (
                          <button
                            type="button"
                            className="font-medium text-[#3b3af2] underline underline-offset-2"
                            onClick={() => setSelectedPackId('anticipo_por_persona')}
                          >
                            ¿Quieres solicitar un anticipo por persona?
                          </button>
                        )}
                        {selectedPackId === 'anticipo_por_persona' && (
                          <button
                            type="button"
                            className="font-medium text-[#3b3af2] underline underline-offset-2"
                            onClick={() => setSelectedPackId('sin_compra_anticipada')}
                          >
                            ¿Quieres que la reserva sea de consumo libre en el local?
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isAdhocDialog && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Presupuesto personalizado</p>
                      <p className="text-xs text-slate-500">
                        Ajusta los elementos del presupuesto y guarda los cambios.
                      </p>
                      <div className="mt-4 space-y-3">
                        {adhocEditItems.length === 0 ? (
                          <p className="text-xs text-slate-500">No hay items en el presupuesto.</p>
                        ) : (
                          <div className="space-y-2">
                            {adhocEditItems.map((item, index) => (
                              <div
                                key={`${item.nombre}-${index}`}
                                className="grid items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1.4fr_auto_auto_auto_auto]"
                              >
                                <Input
                                  value={item.nombre}
                                  onChange={(event) =>
                                    setAdhocEditItems((prev) =>
                                      prev.map((current, idx) =>
                                        idx === index ? { ...current, nombre: event.target.value } : current
                                      )
                                    )
                                  }
                                  className="h-9 text-[12px]"
                                />
                                <select
                                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px]"
                                  value={item.tipo}
                                  onChange={(event) =>
                                    setAdhocEditItems((prev) =>
                                      prev.map((current, idx) =>
                                        idx === index
                                          ? { ...current, tipo: event.target.value as 'comida' | 'bebida' }
                                          : current
                                      )
                                    )
                                  }
                                >
                                  <option value="comida">Comida</option>
                                  <option value="bebida">Bebida</option>
                                </select>
                                <NumberInput
                                  min={1}
                                  value={item.cantidad}
                                  onChangeValue={(value) =>
                                    setAdhocEditItems((prev) =>
                                      prev.map((current, idx) =>
                                        idx === index ? { ...current, cantidad: value } : current
                                      )
                                    )
                                  }
                                  className="h-9 text-[12px] w-20"
                                />
                                <NumberInput
                                  min={0}
                                  value={item.precio_unitario}
                                  onChangeValue={(value) =>
                                    setAdhocEditItems((prev) =>
                                      prev.map((current, idx) =>
                                        idx === index ? { ...current, precio_unitario: value } : current
                                      )
                                    )
                                  }
                                  className="h-9 text-[12px] w-24"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-9 px-2 text-[12px] text-rose-600 hover:text-rose-700"
                                  onClick={() =>
                                    setAdhocEditItems((prev) => prev.filter((_, idx) => idx !== index))
                                  }
                                >
                                  Quitar
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3">
                          <p className="text-xs font-semibold text-slate-700">Añadir manual</p>
                          <div className="mt-2 grid gap-2 md:grid-cols-4">
                            <Input
                              value={adhocManualNombre}
                              onChange={(event) => setAdhocManualNombre(event.target.value)}
                              placeholder="Nombre"
                              className="h-9 text-[12px]"
                            />
                            <select
                              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px]"
                              value={adhocManualTipo}
                              onChange={(event) =>
                                setAdhocManualTipo(event.target.value as 'comida' | 'bebida')
                              }
                            >
                              <option value="comida">Comida</option>
                              <option value="bebida">Bebida</option>
                            </select>
                            <NumberInput
                              min={1}
                              value={adhocManualCantidad}
                              onChangeValue={(value) => setAdhocManualCantidad(value)}
                              placeholder="Cantidad"
                              className="h-9 text-[12px]"
                            />
                            <NumberInput
                              min={0}
                              value={typeof adhocManualPrecio === 'number' ? adhocManualPrecio : null}
                              onChangeValue={(value) => setAdhocManualPrecio(value)}
                              placeholder="Precio"
                              className="h-9 text-[12px]"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-2 h-9 px-3 text-[12px]"
                            onClick={() => {
                              if (!adhocManualNombre || adhocManualPrecio === '') return;
                              setAdhocEditItems((prev) => [
                                ...prev,
                                {
                                  nombre: adhocManualNombre,
                                  cantidad: adhocManualCantidad,
                                  precio_unitario: Number(adhocManualPrecio),
                                  tipo: adhocManualTipo,
                                },
                              ]);
                              setAdhocManualNombre('');
                              setAdhocManualCantidad(1);
                              setAdhocManualPrecio('');
                              setAdhocManualTipo('comida');
                            }}
                            disabled={!adhocManualNombre || adhocManualPrecio === ''}
                          >
                            Añadir manual
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isSinCompraPack && canUseSinCompra && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {isAnticipoPack ? 'Anticipo por persona' : 'Consumo libre en el local'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {isAnticipoPack
                              ? 'Añade el anticipo obligatorio por persona para esta reserva.'
                              : 'Reserva sin anticipo, con consumo libre en el local.'}
                          </p>
                        </div>
                      </div>
                      {isAnticipoPack && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium text-slate-700">Descripción del anticipo</label>
                            <Textarea
                              value={anticipoDescripcion}
                              onChange={(event) => setAnticipoDescripcion(event.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700">Precio (€)</label>
                            <NumberInput
                              value={anticipoPrecio ?? 0}
                              onChangeValue={(value) => setAnticipoPrecio(value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedPack && selectedPack.Categoria !== 'Tickets' && !isSinCompraPack && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-700">{getElementLabel(selectedPack)}</label>
                      <p className="text-xs text-slate-500">{getElementDescription(selectedPack)}</p>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={(selectedElement?.Nombre as string | undefined) ?? ''}
                        onChange={(event) => {
                          const element = elements.find((item) => item.Nombre === event.target.value) ?? null;
                          setSelectedElement(element);
                          setSelectedInterval(null);
                        }}
                      >
                        <option value="">{getElementPlaceholder(selectedPack)}</option>
                        {elements.map((element) => (
                          <option key={String(element.Nombre)} value={String(element.Nombre)}>
                            {String(element.Nombre)}
                            {element.Precio != null ? ` · ${Number(element.Precio).toFixed(2)}€` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedPack?.id && restauranteId && (
                        <CrearElementoModal
                          packId={selectedPack.id}
                          packKind={
                            selectedPack.Categoria === 'Best Deal'
                              ? 'Barra Libre'
                              : (selectedPack.Categoria as 'Menú' | 'Cocktail')
                          }
                          restauranteId={restauranteId}
                          onCreated={handleCreatedElement}
                        />
                      )}
                      {selectedElement && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {selectedPack.Categoria === 'Menú'
                              ? 'Menú seleccionado'
                              : selectedPack.Subcategoria === 'Barra Libre'
                                ? 'Barra libre seleccionada'
                                : selectedPack.Categoria === 'Cocktail'
                                  ? 'Cocktail seleccionado'
                                  : 'Elemento seleccionado'}
                          </p>
                          <ElementoEditor
                            pack={selectedPack}
                            selectedElement={selectedElement}
                            selectedInterval={selectedInterval}
                            restauranteId={restauranteId}
                            onSave={(element, interval) => {
                              setSelectedElement(element);
                              setSelectedInterval(interval);
                            }}
                          />
                        </div>
                      )}
                      {selectedPack.Subcategoria === 'Barra Libre' && selectedElement && (
                        <BarraLibreIntervalo
                          intervalos={getIntervalsForRestaurante(selectedElement, restauranteId)}
                          selected={selectedInterval}
                          onSelect={setSelectedInterval}
                        />
                      )}
                    </div>
                  )}

                  {selectedPack?.Categoria === 'Tickets' && !isSinCompraPack && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-700">Tickets incluidos</p>
                      <p className="text-xs text-slate-500">
                        Elige los tickets que quieres ofrecer en esta reserva o crea uno desde cero. Puedes ajustar el
                        precio y la cantidad que verá el cliente.
                      </p>
                      <TicketsEditor tickets={selectedTickets} onChange={setSelectedTickets} />
                      {selectedPack?.id && restauranteId && (
                        <CrearElementoModal
                          packId={selectedPack.id}
                          packKind="Tickets"
                          restauranteId={restauranteId}
                          onCreated={(element) => {
                            setSelectedTickets((prev) => [
                              ...prev,
                              { ...element, quantity: Number(reserva?.aforoMax ?? 1) } as TicketItem,
                            ]);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter className="border-t border-slate-100 px-6 py-4">
                  <Button variant="outline" onClick={() => setPackDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="bg-[#7472FD] text-white hover:bg-[#5f5bf2]"
                    disabled={!canSavePackChange || savingPack}
                    onClick={confirmUpdatePack}
                  >
                    {savingPack ? 'Guardando...' : 'Guardar cambio'}
                  </Button>
                </DialogFooter>
              </div>
            </div>,
            document.body
          )
        : null}

      <Dialog open={confirmSinCompraOpen} onOpenChange={setConfirmSinCompraOpen}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Habilitar consumo libre en el local</DialogTitle>
            <DialogDescription>
              Si lo activas en el espacio, todos los clientes podrán solicitar consumo libre en este
              espacio desde el marketplace.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 text-xs text-slate-500">
            ¿Solo quieres habilitarlo en esta reserva?{' '}
            <button
              type="button"
              className="font-medium text-[#3b3af2] underline underline-offset-2"
              onClick={() => {
                setAllowSinCompraOverride(true);
                setSelectedPackId('sin_compra_anticipada');
                setConfirmSinCompraOpen(false);
              }}
            >
              Habilitar solo para esta reserva
            </button>
            .
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmSinCompraOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-[#7472fd] text-white" onClick={handleEnableSinCompraSala} disabled={savingSinCompraSala}>
              {savingSinCompraSala ? 'Guardando...' : 'Habilitar en el espacio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {panelRightRailTarget
        ? createPortal(
            <div className="origin-top-left w-[125%] scale-[0.8] space-y-4">
              {facturasCardNode}
              {pagoCardNode}
              {asistentesRailNode}
            </div>,
            panelRightRailTarget
          )
        : null}

      
      <ChatCard
        unreadCount={mensajesUnread}
        chatNombre={chatNombre}
        chatId={chatId}
        reservaId={reserva.id}
        usuarioId={reserva.usuario?.id ?? null}
        usuarioNombre={reserva.usuario?.['Nombre de usuario'] ?? null}
        restauranteId={reserva.restaurante?.id ?? null}
        nombreRestaurante={reserva.restaurante?.['Nombre del restaurante'] ?? null}
        responsableNombre={
          (() => {
            const responsable = (reserva.restaurante as Record<string, unknown> | undefined)
              ?.responsable as Record<string, unknown> | undefined;
            return typeof responsable?.['nombre'] === 'string'
              ? String(responsable['nombre'])
              : null;
          })()
        }
        floatingRightOffset={chatRightOffset}
        onSent={() => loadAll({ silent: true })}
      />
      </div>
    </div>
  );
}
