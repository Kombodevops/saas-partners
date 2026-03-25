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
import { Calendar as CalendarIcon, Copy, Package as PackageIcon } from 'lucide-react';
import {
  ReservaDetalleService,
  type ReservaDetalle,
  type AsistenciaDetalle,
  type FacturaDetalle,
} from '@/lib/services/reserva-detalle.service';
import { ReservaHeader } from '@/app/reservas/[id]/components/reserva-header';
import { NotasEtiquetasCard } from '@/app/reservas/[id]/components/notas-etiquetas-card';
import { ClienteCard } from '@/app/reservas/[id]/components/cliente-card';
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
  const [asistentesStats, setAsistentesStats] = useState({
    totalAsistentes: 0,
    confirmados: 0,
    confirmadosNoPagados: 0,
    pagados: 0,
    talvez: 0,
    noAsisten: 0,
  });
  const [facturas, setFacturas] = useState<FacturaDetalle[]>([]);
  const [facturasAll, setFacturasAll] = useState<FacturaDetalle[]>([]);
  const [showPackEditReason, setShowPackEditReason] = useState(false);
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
  const isFlexibleNoAnticipo = useMemo(() => {
    const categoria = String(reserva?.pack?.Categoria ?? '').toLowerCase();
    const anticipoValue = (precioAnticipo?.Precio ?? precioAnticipo?.price) as number | string | undefined;
    const hasAnticipo = anticipoValue != null && Number(anticipoValue) > 0;
    return categoria === 'flexible' && !hasAnticipo;
  }, [reserva?.pack?.Categoria, precioAnticipo]);
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
      const tiempo = (selectedInterval as Record<string, unknown> | null)?.tiempoSolicitado;
      return Boolean(selectedElement && selectedInterval && tiempo);
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
      packDialogRef.current?.focus({ preventScroll: true });
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

      const stats = await ReservaDetalleService.getConteoAsistentes(reservaId, reservaData.tipoCompra);
      setAsistentesStats(stats);

      const facturasResult = await ReservaDetalleService.getFacturas(reservaId);
      setFacturas(facturasResult.visibles);
      setFacturasAll(facturasResult.facturas);

      if (!reservaData.leadKomvo) {
        const clienteData = await ReservaDetalleService.getClienteDatos({
          reservaId,
          clienteId: reservaData.usuario?.id,
          clienteEmail: reservaData.usuario?.Email,
          clienteTelefono: reservaData.usuario?.Telefono,
        });
        setCliente(clienteData);
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
      const nextKombo: Record<string, unknown> = {
        ...komboCurrent,
        Fecha: eventoFecha,
        Hora: eventoHora,
        horaFin: eventoHoraFin,
        'Tamaño del grupo': {
          ...(komboCurrent['Tamaño del grupo'] as Record<string, unknown> | undefined),
          min: eventoAforoMin ? Number(eventoAforoMin) : '',
          max: eventoAforoMax ? Number(eventoAforoMax) : '',
        },
      };
      const updateResult = await ReservaDetalleService.updateReservaEvento({
        reservaId: reserva.id,
        kombo: nextKombo,
      });
      if (updateResult?.missingEmail) {
        setUpdateEmailFailDialog(true);
      }
      const currentResponsableId =
        (reserva as { responsableEquipo?: { id?: string } | null })?.responsableEquipo?.id ?? '';
      if (responsableId !== currentResponsableId) {
        const selected = responsables.find((item) => item.id === responsableId) ?? null;
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
      }
      const currentCanal =
        typeof (reserva as Record<string, unknown>)?.canal === 'string'
          ? String((reserva as Record<string, unknown>).canal ?? '')
          : '';
      if (canalDraft !== currentCanal) {
        await ReservaDetalleService.updateReservaCanal({
          reservaId: reserva.id,
          canal: canalDraft ? canalDraft : null,
        });
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
      const updateResult = await ReservaDetalleService.updateReservaPack({
        reservaId: reserva.id,
        pack: selected,
        precio: precioPayload,
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
        });
      } else {
        if (!selectedSalaNombre) return;
        updateResult = await ReservaDetalleService.updateReservaRestauranteSala({
          reservaId: reserva.id,
          restauranteId: selectedRestauranteId,
          salaNombre: selectedSalaNombre,
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
        });
      } else {
        if (!selectedSalaNombre) return;
        updateResult = await ReservaDetalleService.updateReservaRestauranteSala({
          reservaId: reserva.id,
          restauranteId,
          salaNombre: selectedSalaNombre,
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

  return (
    <div
      className={
        variant === 'panel'
          ? 'relative h-full overflow-y-auto bg-slate-50 px-6 py-6'
          : 'relative min-h-screen bg-slate-50 px-6 py-8'
      }
    >
      <div className={variant === 'panel' ? 'origin-top-left scale-[0.8] w-[125%]' : ''}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          {variant === 'panel' ? (
            <Button variant="outline" onClick={onClose}>
              Cerrar
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

        <ReservaHeader
          reserva={reserva}
          showClienteContact={!isKomvo}
          onChangeLocal={openLocalDialog}
          onChangeEspacio={openEspacioDialog}
          onEditEvento={openEventoDialog}
          originBadge={originBadge ?? undefined}
        />

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative order-2 space-y-6 lg:order-1">
            <NotasEtiquetasCard
              reservaId={reserva.id}
              notasRaw={reserva.notasReserva ?? []}
              etiquetasRaw={reserva.etiquetas ?? []}
              onReload={() => loadAll({ silent: true })}
            />
            <AsistentesCard
              stats={asistentesStats}
              alergias={asistencias}
              preguntas={
                (reserva.questions as Array<{ question?: string; question_type?: string; required?: boolean; options?: string[] }> | undefined) ??
                []
              }
              showPaymentStats={reserva.tipoCompra?.toLowerCase() === 'entradas'}
              isKomvo={isKomvo}
              reservaId={reserva.id}
              onReload={() => loadAll({ silent: true })}
            />
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
              reservaFechaEvento={(reserva?.kombo as { Fecha?: string | Date } | undefined)?.Fecha ??
                (reserva?.evento as { 'Fecha del evento'?: string | Date } | undefined)?.['Fecha del evento'] ??
                null}
            />
          </div>

          <div className="order-1 space-y-6 lg:order-2">
            {cambioPendiente && cambioSolicitado && (
              <Card className="border border-amber-200 bg-amber-50/60 shadow-sm">
                <CardContent className="space-y-4 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Solicitud de cambio
                      </p>
                      <p className="text-base font-semibold text-slate-900">Cambios solicitados</p>
                      {cambioSolicitado.fechaSolicitud && (
                        <p className="text-xs text-slate-500">
                          Fecha de solicitud: {formatCambioFecha(cambioSolicitado.fechaSolicitud)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-700">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Fecha anterior
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCambioFecha(cambioSolicitado.fechaAnterior)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Fecha nueva
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCambioFecha(cambioSolicitado.fechaNueva)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Hora anterior
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCambioHora(cambioSolicitado.horaAnterior)}
                          {cambioSolicitado.horaFinAnterior
                            ? ` - ${formatCambioHora(cambioSolicitado.horaFinAnterior)}`
                            : ''}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Hora nueva
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCambioHora(cambioSolicitado.horaNueva)}
                          {cambioSolicitado.horaFinNueva
                            ? ` - ${formatCambioHora(cambioSolicitado.horaFinNueva)}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Aforo anterior
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {cambioSolicitado.aforoAnterior ?? '—'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Aforo nuevo
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {cambioSolicitado.aforoNuevo ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {isKomvo ? (
              <Card className="border-none bg-white shadow-sm">
                <CardHeader>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Compartir enlace
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="break-all text-xs text-slate-600">
                      {WEB_URL && reserva?.id ? `${WEB_URL}/plan/${reserva.id}/gestionar` : '—'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!WEB_URL || !reserva?.id) return;
                          try {
                            await navigator.clipboard.writeText(`${WEB_URL}/plan/${reserva.id}/gestionar`);
                            setEmailFailCopied(true);
                            window.setTimeout(() => setEmailFailCopied(false), 1500);
                          } catch {}
                        }}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        {emailFailCopied ? 'Copiado' : 'Copiar enlace'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ClienteCard
                nombre={reserva.usuario?.['Nombre de usuario']}
                email={cliente.email}
                telefono={cliente.telefono}
                manageUrl={
                  WEB_URL && reserva?.id
                    ? isAdhocPack && !reserva.pagado
                      ? `${WEB_URL}/pres/${reserva.id}`
                      : !reserva.leadKomvo &&
                          (reserva.estado ?? '').toLowerCase() === 'aceptado' &&
                          !reserva.pagado &&
                          (reserva.tipoCompra ?? '').toLowerCase() !== 'entradas'
                        ? `${WEB_URL}/pres/${reserva.id}`
                        : `${WEB_URL}/plan/${reserva.id}/gestionar`
                    : null
                }
                userId={reserva.usuario?.id ?? null}
                sendingEmail={sendingManageEmail}
                onSendEmail={async () => {
                  if (!reserva?.id || !cliente.email) return;
                  setSendingManageEmail(true);
                  try {
                    await ReservaDetalleService.sendReservaManageEmail({
                      reservaId: reserva.id,
                      email: cliente.email,
                    });
                  } finally {
                    setSendingManageEmail(false);
                  }
                }}
              />
            )}
            <Card className="border-none bg-white shadow-sm">
              <CardContent className="space-y-4 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Plan</p>
                    <p className="text-base font-semibold text-slate-900">
                      {isAdhocPack
                        ? 'Presupuesto'
                        : reserva.pack?.Categoria === 'Flexible'
                        ? precioAnticipo
                          ? 'Anticipo'
                          : 'Consumo libre en el local'
                        : reserva.pack?.Subcategoria || reserva.pack?.Categoria || 'Plan'}
                    </p>
                    {isAdhocPack ? (
                      <p className="text-xs text-slate-500">Presupuesto personalizado</p>
                    ) : reserva.pack?.Categoria !== 'Flexible' ? (
                      <p className="text-xs text-slate-500">
                        {reserva.pack?.['Nombre del pack'] || 'Sin plan'}
                      </p>
                    ) : null}
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
                                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
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
                                    {typeof item.total === 'number' ? `${(item.total / 100).toFixed(2)}€` : '—'}
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
                  return (
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Detalle solicitado
                      </p>
                      <div className="space-y-3">
                        {hasAnticipo && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Anticipo</p>
                            {getStringField(precioAnticipo, 'Descripción') && (
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {getStringField(precioAnticipo, 'Descripción')}
                              </p>
                            )}
                            {getNumberField(precioAnticipo, 'Precio') != null && (
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {Number(getNumberField(precioAnticipo, 'Precio') ?? 0).toFixed(2)}€
                              </p>
                            )}
                          </div>
                        )}
                        {hasMenu && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Menú</p>
                            {getStringField(precioMenu, 'Nombre') && (
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {getStringField(precioMenu, 'Nombre')}
                              </p>
                            )}
                            {getNumberField(precioMenu, 'Precio') != null && (
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {Number(getNumberField(precioMenu, 'Precio') ?? 0).toFixed(2)}€
                              </p>
                            )}
                          </div>
                        )}
                        {hasCocktail && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cocktail</p>
                            {getStringField(precioCocktail, 'Nombre') && (
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {getStringField(precioCocktail, 'Nombre')}
                              </p>
                            )}
                            {getNumberField(precioCocktail, 'Precio') != null && (
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {Number(getNumberField(precioCocktail, 'Precio') ?? 0).toFixed(2)}€
                              </p>
                            )}
                          </div>
                        )}
                        {hasBarra && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Barra libre</p>
                            {getStringField(precioBarra, 'Nombre') && (
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {getStringField(precioBarra, 'Nombre')}
                              </p>
                            )}
                            {getNumberField(precioBarra, 'Precio') != null && (
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {Number(getNumberField(precioBarra, 'Precio') ?? 0).toFixed(2)}€
                              </p>
                            )}
                            {Boolean(precioBarra?.intervaloSeleccionado) && (
                              <p className="mt-1 text-xs text-slate-500">
                                Intervalo: {String(((precioBarra?.intervaloSeleccionado as Record<string, unknown>)?.duracionMin ?? ''))} -{' '}
                                {String(((precioBarra?.intervaloSeleccionado as Record<string, unknown>)?.duracionMax ?? ''))}
                              </p>
                            )}
                            {String(((precioBarra?.intervaloSeleccionado as Record<string, unknown>)?.tiempoSolicitado ?? '')) && (
                              <p className="mt-1 text-xs text-slate-500">
                                Tiempo seleccionado:{' '}
                                {String(((precioBarra?.intervaloSeleccionado as Record<string, unknown>)?.tiempoSolicitado ?? ''))}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {ticketItems.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tickets</p>
                            <p className="text-xs text-slate-500">{ticketItems.length} tipos</p>
                          </div>
                          <div className="mt-2 space-y-2">
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
                          </div>
                          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {ticketItems
                                .reduce(
                                  (sum, ticket) =>
                                    sum + Number(ticket.quantity ?? 0) * Number(ticket.price ?? 0),
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

            {reserva.estado?.toLowerCase() !== 'pendiente' && (
              <Card className="border-none bg-white shadow-sm">
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pago</p>
                      <p className="text-base font-semibold text-slate-900">
                        {(() => {
                          const tipoCompra = (reserva.tipoCompra ?? '').toLowerCase();
                          if (tipoCompra === 'entradas') return 'Plazo de compra';
                          return isFlexibleNoAnticipo ? 'Fecha límite de asistentes' : 'Fecha límite de pago';
                        })()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const tipoCompra = (reserva.tipoCompra ?? '').toLowerCase();
                        if (tipoCompra !== 'entradas' || paymentWindowConcluded) return null;
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            disabled={savingFechaLimite}
                            onClick={() => setCloseVentaDialogOpen(true)}
                          >
                            Cerrar plazo
                          </Button>
                        );
                      })()}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={openFechaLimiteDialog}
                      >
                        <CalendarIcon className="h-4 w-4" />
                        {(() => {
                          const tipoCompra = (reserva.tipoCompra ?? '').toLowerCase();
                          if (tipoCompra !== 'entradas') return 'Editar fecha';
                          return paymentWindowConcluded ? 'Ampliar fecha' : 'Editar fecha';
                        })()}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    {reserva.fechaLimitePago ? formatDate(reserva.fechaLimitePago) : 'Sin fecha'}
                  </p>
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
                        return reserva.pagado
                          ? 'El cliente ha pagado la totalidad del plan.'
                          : 'El cliente pagará la totalidad del plan.';
                      })()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Dialog open={localDialogOpen} onOpenChange={setLocalDialogOpen}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Cambiar local</DialogTitle>
            <DialogDescription>Selecciona el restaurante y el espacio para esta reserva.</DialogDescription>
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
                  const result = await ReservaDetalleService.updateFechaLimitePago({
                    reservaId: reserva.id,
                    fechaLimitePago: fechaLimiteDraft,
                    usuarioId: reserva.usuario?.id,
                    usuarioEmail: reserva.usuario?.Email ?? null,
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
                  const result = await ReservaDetalleService.updateFechaLimitePago({
                    reservaId: reserva.id,
                    fechaLimitePago: yesterdayIso,
                    usuarioId: reserva.usuario?.id,
                    usuarioEmail: reserva.usuario?.Email ?? null,
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
            <label className="text-sm font-medium text-slate-700">Espacio</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={selectedSalaNombre}
              onChange={(event) => setSelectedSalaNombre(event.target.value)}
              disabled={!restauranteDetalle?.salas?.length}
            >
              <option value="">Selecciona un espacio</option>
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
                return options.map((sala) => (
                  <option key={sala.nombre} value={sala.nombre}>
                    {sala.nombre} · {sala.aforoMinimo ?? 0} - {sala.aforoMaximo ?? 0} pax
                  </option>
                ));
              })()}
            </select>
            {!restauranteDetalle?.salas?.length && (
              <p className="mt-2 text-xs text-slate-500">Este restaurante no tiene espacios configurados.</p>
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
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Editar reserva</DialogTitle>
            <DialogDescription>Actualiza fecha, hora y aforo de la reserva.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Fecha</label>
                <Input
                  type="date"
                  value={eventoFecha}
                  inputMode="none"
                  onKeyDown={(e) => {
                    if (e.key !== "Tab") e.preventDefault();
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
          <div className="grid gap-3 sm:grid-cols-2">
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
          <div>
            <label className="text-sm font-medium text-slate-700">Responsable</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={responsableId}
              onChange={(event) => setResponsableId(event.target.value)}
            >
              <option value="">Equipo sin asignar</option>
              {responsables.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Canal</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={canalDraft}
              onChange={(event) => setCanalDraft(event.target.value)}
            >
              <option value="">Sin canal</option>
              {channels.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                className="justify-center"
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
                Cambiar local
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-center"
                onClick={() => {
                  setEventoDialogOpen(false);
                  if (reserva) {
                    setSelectedSalaNombre((reserva.sala as { nombre?: string } | null | undefined)?.nombre ?? '');
                  }
                  setEspacioDialogOpen(true);
                }}
              >
                Cambiar espacio
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-center"
                onClick={() => {
                  setEventoDialogOpen(false);
                  setFechaLimiteDialogOpen(true);
                }}
              >
                Editar fecha límite
              </Button>
            </div>
          </div>
          <DialogFooter>
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
          </DialogFooter>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
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
        onSent={() => loadAll({ silent: true })}
      />
      </div>
    </div>
  );
}
