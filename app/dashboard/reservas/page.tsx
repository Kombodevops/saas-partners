'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, Filter, MessageCircle, User, Utensils, Calendar, Tag, StickyNote, Package, Plus, Trash2, ArrowUp, UserCheck } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ReservasCalendar } from '@/components/reservations/reservas-calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AuthService } from '@/lib/services/auth.service';
import {
  ReservasService,
  type ReservaFilterId,
  type ReservaItem,
  type ReservasCursor,
} from '@/lib/services/reservas.service';
import { ChatsService, type ChatItem } from '@/lib/services/chats.service';
import { ReservasAnalyticsService } from '@/lib/services/reservas-analytics.service';
import { AnalyticsChannelsService, type AnalyticsChannel } from '@/lib/services/analytics-channels.service';
import type { DocumentSnapshot } from 'firebase/firestore';
import { PendienteActionsDialog } from '@/app/dashboard/reservas/components/pendiente-actions-dialog';
import { useRestaurantes } from '@/components/shared/restaurantes-context';
import { ReservaDetalleContent } from '@/components/reservations/reserva-detalle-content';
import { NotasEtiquetasModals } from '@/components/reservations/notas-etiquetas-modals';
import { ReservaDetalleService } from '@/lib/services/reserva-detalle.service';
import { WorkersService } from '@/lib/services/workers.service';

const FILTERS: { id: ReservaFilterId; label: string }[] = [
  { id: 'requiereAccion', label: 'Requiere accion' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'confirmadas', label: 'Confirmadas' },
  { id: 'completadas', label: 'Completadas' },
  { id: 'expiradas', label: 'Falladas' },
];

type Vista = 'lista' | 'calendario';

const MAX_RANGE_DAYS = 90;

type ModalTarget = {
  id: string;
  notas: unknown[];
  etiquetas: unknown[];
} | null;

const toDate = (value?: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && '__type__' in value && (value as { __type__?: string }).__type__ === 'Timestamp') {
    const parsed = new Date((value as { value?: string }).value ?? '');
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const toDateFromKombo = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getStatusBadge = (reserva: ReservaItem) => {
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
    return { label: 'Consulta de disponibilidad', className: 'bg-[rgba(13,129,221,0.12)] text-[#0D81DD]' };
  }
  if (estado === 'pendientegestion') {
    return { label: 'Esperando confirmación', className: 'bg-[rgba(255,34,192,0.12)] text-[#FF22C0]' };
  }
  if (estado === 'pendientecambio') {
    return { label: 'Solicitud de cambio', className: 'bg-[rgba(255,195,42,0.12)] text-[#FFC32A]' };
  }
  if (estado === 'cambiorechazado') {
    return { label: 'Esperando reconfirmación', className: 'bg-[rgba(255,195,42,0.12)] text-[#FFC32A]' };
  }
  if (estado === 'pendienteasistentes') {
    return { label: 'Pendiente de asistentes', className: 'bg-[rgba(255,154,25,0.12)] text-[#FF9A19]' };
  }
  if (estado === 'aceptado' && !reserva.pagado) {
    return { label: 'Confirmada · Pendiente de pago', className: 'bg-[rgba(255,154,25,0.12)] text-[#FF9A19]' };
  }
  if (estado === 'aceptado' && reserva.pagado) {
    if (tipoCompra === 'entradas') {
      return {
        label: isLimiteConcluido
          ? 'Confirmada · Periodo de pago concluido'
          : 'Confirmada · En periodo de pago',
        className: isLimiteConcluido
          ? 'bg-[rgba(57,157,89,0.12)] text-[#399D59]'
          : 'bg-[rgba(255,154,25,0.12)] text-[#FF9A19]',
      };
    }
    if (isFlexibleNoAnticipo) {
      return { label: 'Confirmada', className: 'bg-[rgba(57,157,89,0.12)] text-[#399D59]' };
    }
    return { label: 'Confirmada · Pagada', className: 'bg-[rgba(57,157,89,0.12)] text-[#399D59]' };
  }
  if (estado === 'completado') {
    return { label: 'Completada', className: 'bg-[rgba(116,114,253,0.12)] text-[#7472FD]' };
  }
  if (estado === 'expirado') {
    return { label: 'Expirada', className: 'bg-[rgba(0,0,0,0.08)] text-[#000000]' };
  }
  if (estado === 'fallado') {
    return { label: 'Fallada', className: 'bg-[rgba(186,3,29,0.12)] text-[#BA031D]' };
  }
  if (estado === 'no_gestionado') {
    return { label: 'No gestionada', className: 'bg-slate-100 text-slate-700' };
  }
  if (estado === 'sin_local') {
    return { label: 'Sin local asignado', className: 'bg-[rgba(116,114,253,0.12)] text-[#7472FD]' };
  }

  return { label: reserva.estado ?? 'Sin estado', className: 'bg-slate-100 text-slate-700' };
};

const getPlanLabel = (reserva: ReservaItem) => {
  const categoria = reserva.pack?.Categoria ?? '';
  const subcategoria = reserva.pack?.Subcategoria ?? '';
  const precio = (reserva.precio ?? {}) as Record<string, unknown>;
  if (categoria.toLowerCase() === 'adhoc') return 'Presupuesto personalizado';
  if (categoria === 'Flexible') {
    return precio.Anticipo ? 'Anticipo' : 'Consumo libre';
  }
  if (subcategoria) return subcategoria;
  return categoria || 'Plan';
};

const getNotasPreview = (reserva: ReservaItem) => {
  const notas = (reserva.notasReserva ?? []) as Array<Record<string, unknown>>;
  return notas
    .map((nota) => String(nota.contenido ?? ''))
    .filter((value) => value.trim().length > 0)
    .slice(0, 2);
};

const getEtiquetasPreview = (reserva: ReservaItem) => {
  const etiquetas = (reserva.etiquetas ?? []) as Array<Record<string, unknown>>;
  return etiquetas
    .map((etiqueta) => String(etiqueta.texto ?? etiqueta.nombre ?? ''))
    .filter((value) => value.trim().length > 0)
    .slice(0, 2);
};

const colorToRgba = (color: number) => {
  const a = (color >> 24) & 255;
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const alpha = Math.max(0.3, Math.min(1, a / 255));
  return {
    fill: `rgba(${r}, ${g}, ${b}, ${alpha})`,
  };
};

const colorToSoft = (color: number) => {
  const a = (color >> 24) & 255;
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const alpha = Math.max(0.16, Math.min(0.22, a / 255));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Tabs de reserva (Info/Notas/Etiquetas) - reservado para futuro.
// const ReservaTabsShell = ({
//   reserva,
//   info,
// }: {
//   reserva: ReservaItem;
//   info: React.ReactNode;
// }) => {
//   const notas = getNotasPreview(reserva);
//   const etiquetas = getEtiquetasPreview(reserva);
//   const [active, setActive] = useState<'info' | 'notas' | 'etiquetas'>('info');
//   const tabs = [
//     { id: 'info', label: 'Info' },
//     { id: 'notas', label: 'Notas' },
//     { id: 'etiquetas', label: 'Etiquetas' },
//   ] as const;
//   return (
//     <div className="relative">
//       <div className="flex items-end justify-start gap-1 pl-3">
//         {tabs.map((tab, index) => {
//           const isActive = active === tab.id;
//           return (
//             <button
//               key={tab.id}
//               type="button"
//               onClick={() => setActive(tab.id)}
//               className={`relative -mb-px rounded-t-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold transition ${
//                 isActive
//                   ? 'z-10 bg-white text-slate-900 border-b-white'
//                   : 'bg-slate-50 text-slate-500 hover:text-slate-700'
//               } ${index === 0 ? 'ml-0' : ''}`}
//             >
//               {tab.label}
//             </button>
//           );
//         })}
//       </div>
//       <Card className="border border-slate-200 bg-white py-1 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.22)]">
//         {active === 'info' && info}
//         {active !== 'info' && (
//           <CardContent className="px-4 pt-4 pb-3 text-[11px] text-slate-500">
//             {active === 'notas' && (
//               <div className="space-y-1">
//                 {notas.length ? (
//                   notas.map((nota, idx) => (
//                     <p key={`${nota}-${idx}`} className="line-clamp-1">
//                       {nota}
//                     </p>
//                   ))
//                 ) : (
//                   <p>Sin notas</p>
//                 )}
//               </div>
//             )}
//             {active === 'etiquetas' && (
//               <div className="space-y-1">
//                 {etiquetas.length ? (
//                   etiquetas.map((tag, idx) => (
//                     <p key={`${tag}-${idx}`} className="line-clamp-1">
//                       #{tag}
//                     </p>
//                   ))
//                 ) : (
//                   <p>Sin etiquetas</p>
//                 )}
//               </div>
//             )}
//           </CardContent>
//         )}
//       </Card>
//     </div>
//   );
// };

  const getOrigenReserva = (
    reserva: ReservaItem,
    channelMap: Record<string, AnalyticsChannel>
  ): { label: string; className: string } => {
    const rawCanal = (reserva as unknown as Record<string, unknown>)?.canal;
    const canal = typeof rawCanal === 'string' ? rawCanal.trim() : '';
    if (reserva.leadKomvo === false && canal) {
      return {
        label: `Reserva de ${canal}`,
        className: 'border-slate-200 bg-slate-50 text-slate-700',
      };
    }
    if (reserva.leadKomvo === false) {
      return {
        label: 'Reserva del restaurante',
        className: 'border-slate-200 bg-slate-50 text-slate-700',
      };
    }
    return {
      label: 'Reserva de Komvo',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
    };
  };

  const getEstadoKey = (reserva: ReservaItem): string => {
    const estado = (reserva.estado ?? '').toLowerCase();
    const tipoCompra = (reserva.tipoCompra ?? '').toLowerCase();
    if (estado === 'pendiente') return 'pendiente_disponibilidad';
    if (estado === 'pendientegestion') return 'pendiente_confirmacion';
    if (estado === 'pendientecambio') return 'pendiente_cambio';
    if (estado === 'cambiorechazado') return 'cambio_rechazado';
    if (estado === 'pendienteasistentes') return 'pendiente_asistentes';
    if (estado === 'aceptado' && !reserva.pagado) return 'pendiente_pago';
    if (estado === 'aceptado' && reserva.pagado) {
      return tipoCompra === 'entradas' ? 'confirmada_individual' : 'confirmada';
    }
    if (estado === 'completado') return 'completada';
    if (estado === 'expirado') return 'expirada';
    if (estado === 'fallado') return 'fallada';
    if (estado === 'no_gestionado') return 'no_gestionado';
    if (estado === 'sin_local') return 'sin_local';
    return 'otro';
  };

  const estadoBarColor: Record<string, string> = {
    pendiente_disponibilidad: 'bg-[#0D81DD]',
    pendiente_confirmacion: 'bg-[#FF22C0]',
    pendiente_cambio: 'bg-[#FFC32A]',
    cambio_rechazado: 'bg-[#FFC32A]',
    pendiente_asistentes: 'bg-[#FF9A19]',
    pendiente_pago: 'bg-[#FF9A19]',
    confirmada_pendiente_pago: 'bg-[#FF9A19]',
    confirmada_periodo_pago: 'bg-[#FF9A19]',
    confirmada_periodo_pago_concluido: 'bg-[#399D59]',
    confirmada: 'bg-[#399D59]',
    confirmada_individual: 'bg-[#FF9A19]',
    completada: 'bg-[#7472FD]',
    expirada: 'bg-[#000000]',
    fallada: 'bg-[#BA031D]',
    no_gestionado: 'bg-slate-500',
    sin_local: 'bg-[#7472FD]',
    otro: 'bg-slate-400',
  };

export default function ReservasDashboardPage() {
  const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const [reservas, setReservas] = useState<ReservaItem[]>([]);
  const [chats, setChats] = useState<Record<string, ChatItem>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ReservaFilterId>('requiereAccion');
  const [calendarFilter, setCalendarFilter] = useState<ReservaFilterId | 'all'>('all');
  const [vista, setVista] = useState<Vista>('lista');
  const [sortBy, setSortBy] = useState<'fecha_desc' | 'fecha_asc' | 'restaurante_asc' | 'restaurante_desc' | 'estado_asc' | 'estado_desc'>('fecha_desc');
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [mesVisible, setMesVisible] = useState<Date>(() => startOfMonth(new Date()));
  const [restauranteFiltro, setRestauranteFiltro] = useState<string[]>([]);
  const [restauranteDraft, setRestauranteDraft] = useState<string[]>([]);
  const [showRestauranteDropdown, setShowRestauranteDropdown] = useState(false);
  const [responsableFiltro, setResponsableFiltro] = useState<string[]>([]);
  const [responsableDraft, setResponsableDraft] = useState<string[]>([]);
  const [showResponsableDropdown, setShowResponsableDropdown] = useState(false);
  const [responsables, setResponsables] = useState<
    Array<{ id: string; nombre: string; displayName: string; isMe?: boolean }>
  >([]);
  const [channels, setChannels] = useState<AnalyticsChannel[]>([]);
  const [countsRefresh, setCountsRefresh] = useState(0);
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const [detailReservaId, setDetailReservaId] = useState<string | null>(null);
  const [notesTarget, setNotesTarget] = useState<ModalTarget>(null);
  const [tagsTarget, setTagsTarget] = useState<ModalTarget>(null);
  const [etiquetasPopoverId, setEtiquetasPopoverId] = useState<string | null>(null);
  const [etiquetasClosingId, setEtiquetasClosingId] = useState<string | null>(null);
  const [etiquetaDraftById, setEtiquetaDraftById] = useState<Record<string, string>>({});
  const [etiquetaDraftColorById, setEtiquetaDraftColorById] = useState<Record<string, number>>({});
  const [etiquetaDraftOpenById, setEtiquetaDraftOpenById] = useState<Record<string, boolean>>({});
  const [etiquetaPendingColorsById, setEtiquetaPendingColorsById] = useState<
    Record<string, Record<number, number>>
  >({});
  const [etiquetaEditById, setEtiquetaEditById] = useState<Record<string, Record<number, boolean>>>({});
  const [etiquetaEditTextById, setEtiquetaEditTextById] = useState<Record<string, Record<number, string>>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);
  const [rangoCalendario, setRangoCalendario] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  const channelMap = useMemo(
    () =>
      Object.fromEntries(
        channels
          .filter((channel) => channel.name)
          .map((channel) => [channel.name.toLowerCase(), channel])
      ),
    [channels]
  );
  const [counts, setCounts] = useState({
    requiereAccion: 0,
    pendientes: 0,
    confirmadas: 0,
    completadas: 0,
    expiradas: 0,
  });
  const [calendarItems, setCalendarItems] = useState<ReservaItem[]>([]);
  const [calendarCursor, setCalendarCursor] = useState<DocumentSnapshot | null>(null);
  const [calendarHasMore, setCalendarHasMore] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [changeActionById, setChangeActionById] = useState<Record<string, 'accept' | 'reject' | null>>({});
  const [expiredActionById, setExpiredActionById] = useState<Record<string, 'confirm' | 'cancel' | null>>({});
  const [expiredConfirmOpen, setExpiredConfirmOpen] = useState(false);
  const [expiredConfirmAction, setExpiredConfirmAction] = useState<'confirm' | 'cancel' | null>(null);
  const [expiredConfirmReservaId, setExpiredConfirmReservaId] = useState<string | null>(null);
  const [changeDialogReserva, setChangeDialogReserva] = useState<ReservaItem | null>(null);
  const [changeFechaLimite, setChangeFechaLimite] = useState('');
  const [changeFechaError, setChangeFechaError] = useState<string | null>(null);
  const [emailFailDialog, setEmailFailDialog] = useState(false);
  const [emailFailLink, setEmailFailLink] = useState<string | null>(null);
  const [emailFailCopied, setEmailFailCopied] = useState(false);
  const [emailFailMode, setEmailFailMode] = useState<'confirm' | 'cancel' | null>(null);
  const [monthAnalytics, setMonthAnalytics] = useState<Record<string, number> | null>(null);
  const [monthDayStats, setMonthDayStats] = useState<
    Record<
      string,
      {
        byStatus?: Record<string, number>;
        byRestaurante?: Record<
          string,
          { byStatus?: Record<string, number>; byResponsable?: Record<string, { byStatus?: Record<string, number> }> }
        >;
        byResponsable?: Record<string, { byStatus?: Record<string, number> }>;
      }
    > | null
  >(null);
  const [monthRestStats, setMonthRestStats] = useState<Record<string, Record<string, number>> | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const STORAGE_KEY = 'reservas_view_state';
  const didRestoreRef = useRef(false);
  const cursorRef = useRef<ReservasCursor | null>(null);
  const partnerIdRef = useRef<string | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const calendarLoaderRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const etiquetasPopoverRef = useRef<HTMLDivElement | null>(null);
  const calendarCacheRef = useRef(
    new Map<
      string,
      {
        items: ReservaItem[];
        cursor: DocumentSnapshot | null;
        hasMore: boolean;
        ts: number;
      }
    >()
  );
  const updatingDetailRef = useRef(false);
  const { restaurantes } = useRestaurantes();
  const restaurantesById = useMemo(
    () => new Map(restaurantes.map((rest) => [rest.id, rest])),
    [restaurantes]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        selectedFilter?: ReservaFilterId;
        calendarFilter?: ReservaFilterId | 'all';
        vista?: Vista;
        sortBy?: typeof sortBy;
        restauranteFiltro?: string[];
        responsableFiltro?: string[];
        mesVisible?: string;
        rangoFrom?: string;
        rangoTo?: string;
        fechaSeleccionada?: string;
      };
      if (parsed.selectedFilter) setSelectedFilter(parsed.selectedFilter);
      if (parsed.calendarFilter) setCalendarFilter(parsed.calendarFilter);
      if (parsed.vista) setVista(parsed.vista);
      if (parsed.sortBy) setSortBy(parsed.sortBy);
      if (parsed.restauranteFiltro != null) {
        setRestauranteFiltro(parsed.restauranteFiltro);
        setRestauranteDraft(parsed.restauranteFiltro);
      }
      if (parsed.responsableFiltro != null) {
        setResponsableFiltro(parsed.responsableFiltro);
        setResponsableDraft(parsed.responsableFiltro);
      }
      if (parsed.mesVisible) setMesVisible(startOfMonth(new Date(parsed.mesVisible)));
      if (parsed.rangoFrom || parsed.rangoTo) {
        setRangoCalendario({
          from: parsed.rangoFrom ? new Date(parsed.rangoFrom) : undefined,
          to: parsed.rangoTo ? new Date(parsed.rangoTo) : undefined,
        });
      }
      if (parsed.fechaSeleccionada) setFechaSeleccionada(new Date(parsed.fechaSeleccionada));
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
    didRestoreRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => {
      const raw = window.localStorage.getItem('komvo_sidebar_collapsed');
      setSidebarCollapsed(raw === 'true');
    };
    read();
    const handler = (event: StorageEvent) => {
      if (event.key === 'komvo_sidebar_collapsed') read();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!didRestoreRef.current) return;
    const payload = {
      selectedFilter,
      calendarFilter,
      vista,
      sortBy,
      restauranteFiltro,
      responsableFiltro,
      mesVisible: mesVisible?.toISOString?.(),
      rangoFrom: rangoCalendario.from ? rangoCalendario.from.toISOString() : undefined,
      rangoTo: rangoCalendario.to ? rangoCalendario.to.toISOString() : undefined,
      fechaSeleccionada: fechaSeleccionada ? fechaSeleccionada.toISOString() : undefined,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    selectedFilter,
    calendarFilter,
    vista,
    sortBy,
    restauranteFiltro,
    responsableFiltro,
    mesVisible,
    rangoCalendario.from,
    rangoCalendario.to,
    fechaSeleccionada,
  ]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const partner = await AuthService.getCurrentPartner();
        if (!partner) {
          setError('No se pudo cargar el partner');
          return;
        }

        partnerIdRef.current = partner.id;

        if (!active) return;

        const userId = AuthService.getCurrentUser()?.uid ?? '';
        const [workerList, channelList] = await Promise.all([
          WorkersService.listWorkers(partner.id),
          AnalyticsChannelsService.getChannelsWithColors(partner.id),
        ]);
        const options: Array<{ id: string; nombre: string; displayName: string; isMe?: boolean }> = workerList.map((worker) => {
          const isMe = userId ? worker.id === userId : false;
          return {
            id: worker.id,
            nombre: worker.nombre,
            isMe,
            displayName: isMe ? `Yo${worker.nombre ? ` · ${worker.nombre}` : ''}` : worker.nombre,
          };
        });
        setResponsables(options);
        setChannels(channelList);
        // no-op: realtime listener removed

        const nextCounts = await ReservasService.getCountsByPartnerId({ partnerId: partner.id });
        setCounts(nextCounts);

        cursorRef.current = null;
        setReservas([]);
        setHasMore(true);
        await loadMore(selectedFilter, true);
      } catch (err) {
        if (!active) return;
        console.error('[reservas] load error', err);
        setError(err instanceof Error ? err.message : 'Error al cargar reservas');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const authUnsub = AuthService.onAuthStateChanged((user) => {
      if (!user && active) {
        setError('No se pudo cargar el partner');
        setIsLoading(false);
        return;
      }
      load();
    });

    return () => {
      active = false;
      authUnsub();
    };
  }, []);

  useEffect(() => {
    if (!partnerIdRef.current) return;
    cursorRef.current = null;
    setReservas([]);
    setHasMore(true);
    void loadMore(selectedFilter, true);
  }, [selectedFilter, restauranteFiltro, responsableFiltro, sortBy]);

  useEffect(() => {
    if (!partnerIdRef.current || vista !== 'calendario') return;
    const monthKey = format(mesVisible, 'yyyy-MM');
    let active = true;
    void (async () => {
      const analytics = await ReservasAnalyticsService.getMonthAnalytics(partnerIdRef.current ?? '', monthKey);
      if (!active) return;
      setMonthAnalytics(analytics?.byStatus ?? null);
      setMonthDayStats(
        analytics?.byDay
          ? Object.fromEntries(
              Object.entries(analytics.byDay).map(([day, payload]) => [
                day,
                {
                  byStatus: payload?.byStatus ?? {},
                  byRestaurante: payload?.byRestaurante ?? {},
                  byResponsable: payload?.byResponsable ?? {},
                },
              ])
            )
          : null
      );
      setMonthRestStats(
        analytics?.byRestaurante
          ? Object.fromEntries(
              Object.entries(analytics.byRestaurante).map(([id, payload]) => [id, payload.byStatus ?? {}])
            )
          : null
      );
    })();
    return () => {
      active = false;
    };
  }, [mesVisible, restauranteFiltro, responsableFiltro, selectedFilter, vista, calendarFilter, sortBy, calendarRefresh]);

  useEffect(() => {
    if (!partnerIdRef.current) return;

    void (async () => {
      const monthKey = vista === 'calendario' ? format(mesVisible, 'yyyy-MM') : 'all_time';
      if (vista === 'calendario') {
        // En calendario siempre usamos analytics (sin fallback a reservas).
        const fromDate = rangoCalendario.from ?? rangoCalendario.to ?? null;
        const toDate = rangoCalendario.to ?? rangoCalendario.from ?? null;

        if (fromDate && toDate) {
          const monthKeys = getMonthKeysBetween(fromDate, toDate);
          const analyticsList = await Promise.all(
            monthKeys.map((key) => ReservasAnalyticsService.getMonthAnalytics(partnerIdRef.current ?? '', key))
          );
          const combinedByDay: Record<
            string,
            {
              byStatus?: Record<string, number>;
              byRestaurante?: Record<string, { byStatus?: Record<string, number>; byResponsable?: Record<string, { byStatus?: Record<string, number> }> }>;
              byResponsable?: Record<string, { byStatus?: Record<string, number> }>;
            }
          > = {};
          analyticsList.forEach((analytics) => {
            Object.entries(analytics?.byDay ?? {}).forEach(([day, payload]) => {
              combinedByDay[day] = {
                byStatus: payload?.byStatus ?? {},
                byRestaurante: payload?.byRestaurante ?? {},
                byResponsable: payload?.byResponsable ?? {},
              };
            });
          });
          const nextCounts = sumAnalyticsForRange(
            combinedByDay,
            fromDate,
            toDate,
            restauranteFiltro.length ? restauranteFiltro : undefined,
            calendarFilter,
            responsableFiltro.length ? responsableFiltro : undefined
          );
          setCounts(nextCounts);
          return;
        }

        const analytics = await ReservasAnalyticsService.getMonthAnalytics(partnerIdRef.current ?? '', monthKey);
        if (!analytics) {
          setCounts({
            requiereAccion: 0,
            pendientes: 0,
            confirmadas: 0,
            completadas: 0,
            expiradas: 0,
          });
          return;
        }
        const source = (() => {
          if (restauranteFiltro.length && responsableFiltro.length) {
            return restauranteFiltro.reduce((acc, id) => {
              const byResp = analytics.byRestaurante?.[id]?.byResponsable ?? {};
              responsableFiltro.forEach((respId) => {
                const map = byResp?.[respId]?.byStatus ?? {};
                Object.entries(map).forEach(([k, v]) => {
                  acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
                });
              });
              return acc;
            }, {} as Record<string, number>);
          }
          if (restauranteFiltro.length) {
            return restauranteFiltro.reduce((acc, id) => {
              const map = analytics.byRestaurante?.[id]?.byStatus ?? {};
              Object.entries(map).forEach(([k, v]) => {
                acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
              });
              return acc;
            }, {} as Record<string, number>);
          }
          if (responsableFiltro.length) {
            return responsableFiltro.reduce((acc, respId) => {
              const map = analytics.byResponsable?.[respId]?.byStatus ?? {};
              Object.entries(map).forEach(([k, v]) => {
                acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
              });
              return acc;
            }, {} as Record<string, number>);
          }
          return analytics.byStatus;
        })();
        const nextCounts = buildCountsFromAnalytics(source);
        setCounts(nextCounts);
        return;
      }
      const analytics = await ReservasAnalyticsService.getMonthAnalytics(partnerIdRef.current ?? '', monthKey);
      if (!analytics) {
        setCounts({
          requiereAccion: 0,
          pendientes: 0,
          confirmadas: 0,
          completadas: 0,
          expiradas: 0,
        });
        return;
      }
      const source = (() => {
        if (restauranteFiltro.length && responsableFiltro.length) {
          return restauranteFiltro.reduce((acc, id) => {
            const byResp = analytics.byRestaurante?.[id]?.byResponsable ?? {};
            responsableFiltro.forEach((respId) => {
              const map = byResp?.[respId]?.byStatus ?? {};
              Object.entries(map).forEach(([k, v]) => {
                acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
              });
            });
            return acc;
          }, {} as Record<string, number>);
        }
        if (restauranteFiltro.length) {
          return restauranteFiltro.reduce((acc, id) => {
            const map = analytics.byRestaurante?.[id]?.byStatus ?? {};
            Object.entries(map).forEach(([k, v]) => {
              acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
            });
            return acc;
          }, {} as Record<string, number>);
        }
        if (responsableFiltro.length) {
          return responsableFiltro.reduce((acc, respId) => {
            const map = analytics.byResponsable?.[respId]?.byStatus ?? {};
            Object.entries(map).forEach(([k, v]) => {
              acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
            });
            return acc;
          }, {} as Record<string, number>);
        }
        return analytics.byStatus;
      })();
      const nextCounts = buildCountsFromAnalytics(source);
      setCounts(nextCounts);
    })();
  }, [mesVisible, rangoCalendario.from, rangoCalendario.to, restauranteFiltro, responsableFiltro, vista, countsRefresh]);

  const handleReservaActionCompleted = () => {
    setCountsRefresh((prev) => prev + 1);
    if (vista === 'calendario') {
      setCalendarRefresh((prev) => prev + 1);
    }
    calendarCacheRef.current.clear();
    cursorRef.current = null;
    setReservas([]);
    setHasMore(true);
    void loadMore(selectedFilter, true);
  };

  const handleChangeRequestAction = async (
    reservaId: string,
    action: 'accept' | 'reject',
    fechaLimitePago?: string
  ) => {
    if (!reservaId) return;
    setChangeActionById((prev) => ({ ...prev, [reservaId]: action }));
    try {
      if (action === 'accept') {
        await ReservaDetalleService.aceptarCambioReserva({ reservaId, fechaLimitePago: fechaLimitePago ?? '' });
      } else {
        await ReservaDetalleService.rechazarCambioReserva({ reservaId });
      }
      handleReservaActionCompleted();
    } finally {
      setChangeActionById((prev) => ({ ...prev, [reservaId]: null }));
    }
  };

  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const openChangeDialog = (reserva: ReservaItem) => {
    setChangeDialogReserva(reserva);
    setChangeFechaLimite(reserva.fechaLimitePago ?? '');
    setChangeFechaError(null);
  };
  const confirmChangeDialog = async () => {
    if (!changeDialogReserva) return;
    if (!changeFechaLimite) {
      setChangeFechaError('Indica una fecha límite de pago.');
      return;
    }
    if (changeFechaLimite < todayISO) {
      setChangeFechaError('La fecha límite no puede ser anterior a hoy.');
      return;
    }
    if (changeDialogReserva.cambioSolicitado?.fechaNueva && changeFechaLimite > changeDialogReserva.cambioSolicitado?.fechaNueva) {
      setChangeFechaError('La fecha límite no puede ser posterior a la nueva fecha del evento.');
      return;
    }
    setChangeFechaError(null);
    const reservaId = changeDialogReserva.id;
    setChangeDialogReserva(null);
    await handleChangeRequestAction(reservaId, 'accept', changeFechaLimite);
  };

  const handleExpiredAction = async (reservaId: string, action: 'confirm' | 'cancel') => {
    if (!reservaId) return;
    setExpiredActionById((prev) => ({ ...prev, [reservaId]: action }));
    try {
      const reserva = [...reservas, ...calendarItems].find((item) => item.id === reservaId);
      const manageUrl =
        reserva && WEB_URL
          ? !reserva.leadKomvo && !reserva.pagado
            ? `${WEB_URL}/pres/${reserva.id}`
            : `${WEB_URL}/plan/${reserva.id}/gestionar`
          : null;
      if (action === 'confirm') {
        const result = await ReservaDetalleService.confirmarReservaExpirada({ reservaId });
        if (result && result.missingUser) {
          setEmailFailMode('confirm');
          setEmailFailLink(manageUrl);
          setEmailFailDialog(true);
        }
      } else {
        const result = await ReservaDetalleService.cancelarReservaExpirada({ reservaId });
        if (result && result.missingUser) {
          setEmailFailMode('cancel');
          setEmailFailLink(null);
          setEmailFailDialog(true);
        }
      }
      handleReservaActionCompleted();
    } finally {
      setExpiredActionById((prev) => ({ ...prev, [reservaId]: null }));
    }
  };

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;
        if (loadingRef.current || !hasMore) return;
        void loadMore(selectedFilter, false);
      },
      { rootMargin: '200px' }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [selectedFilter, hasMore]);

  useEffect(() => {
    if (vista !== 'calendario') return;
    if (!calendarLoaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;
        if (calendarLoading || !calendarHasMore) return;
        void loadMoreCalendar(false);
      },
      { rootMargin: '200px' }
    );

    observer.observe(calendarLoaderRef.current);
    return () => observer.disconnect();
  }, [vista, calendarHasMore, calendarLoading]);

  const getCalendarRange = () => {
    if (rangoCalendario.from || rangoCalendario.to) {
      const from = rangoCalendario.from ?? rangoCalendario.to ?? mesVisible;
      const to = rangoCalendario.to ?? rangoCalendario.from ?? mesVisible;
      return { from, to };
    }
    return { from: startOfMonth(mesVisible), to: endOfMonth(mesVisible) };
  };

  const getCalendarCacheKey = () => {
    const { from, to } = getCalendarRange();
    const restKey = restauranteFiltro.length ? restauranteFiltro.slice().sort().join(',') : 'all';
    const respKey = responsableFiltro.length ? responsableFiltro.slice().sort().join(',') : 'all';
    return [
      'calendar',
      partnerIdRef.current ?? 'no-partner',
      format(from, 'yyyy-MM-dd'),
      format(to, 'yyyy-MM-dd'),
      calendarFilter,
      sortBy,
      restKey,
      respKey,
    ].join('|');
  };

  const loadMore = async (filter: ReservaFilterId, reset = false) => {
    if (!partnerIdRef.current) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoadingMore(true);

    try {
        const result = await ReservasService.getReservasPage({
          partnerId: partnerIdRef.current,
          filter,
          restauranteIds: restauranteFiltro.length ? restauranteFiltro : undefined,
          responsableIds: responsableFiltro.length ? responsableFiltro : undefined,
          sortBy,
          pageSize: 10,
          cursor: reset ? null : cursorRef.current,
        });

      cursorRef.current = result.cursor ?? null;
      setHasMore(result.hasMore);
      setReservas((prev) => {
        if (reset) return result.items;
        const ids = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        result.items.forEach((item) => {
          if (!ids.has(item.id)) merged.push(item);
        });
        return merged;
      });

      const ids = result.items.map((item) => item.id);
      if (ids.length) {
        const chatsMap = await ChatsService.getChatsByReservaIds(ids);
        setChats((prev) => ({ ...prev, ...chatsMap }));
      }
    } catch (err) {
      console.error('[reservas] paged error', err);
      setError(err instanceof Error ? err.message : 'Error al cargar reservas');
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  };

  const refreshReservaById = useCallback(async (reservaId: string | null) => {
    if (!reservaId || updatingDetailRef.current) return;
    updatingDetailRef.current = true;
    try {
      const updated = await ReservasService.getById(reservaId);
      if (!updated) return;
      setReservas((prev) => {
        const idx = prev.findIndex((item) => item.id === updated.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
      setCalendarItems((prev) => {
        if (prev.length === 0) return prev;
        const idx = prev.findIndex((item) => item.id === updated.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    } finally {
      updatingDetailRef.current = false;
    }
  }, []);

  const closeEtiquetasPopover = useCallback(
    (currentId: string, triggerSave: boolean) => {
      setEtiquetasClosingId(currentId);
      setEtiquetasPopoverId(null);
      if (triggerSave) {
        const texto = (etiquetaDraftById[currentId] ?? '').trim();
        if (texto) {
          const color = etiquetaDraftColorById[currentId] ?? 0xff7472fd;
          void ReservaDetalleService.addEtiqueta(currentId, { texto, color }).then(() => {
            void refreshReservaById(currentId);
          });
        }
        const pendingColors = etiquetaPendingColorsById[currentId] ?? {};
        const pendingEntries = Object.entries(pendingColors);
        if (pendingEntries.length) {
          void Promise.all(
            pendingEntries.map(([idx, color]) =>
              ReservaDetalleService.updateEtiquetaColor(currentId, Number(idx), color)
            )
          ).then(() => {
            void refreshReservaById(currentId);
          });
        }
        const pendingText = etiquetaEditTextById[currentId] ?? {};
        const textEntries = Object.entries(pendingText).filter(([, value]) => value.trim().length > 0);
        if (textEntries.length) {
          void Promise.all(
            textEntries.map(([idx, text]) =>
              ReservaDetalleService.updateEtiquetaTexto(currentId, Number(idx), text.trim())
            )
          ).then(() => {
            void refreshReservaById(currentId);
          });
        }
        setEtiquetaPendingColorsById((prev) => ({ ...prev, [currentId]: {} }));
        setEtiquetaEditById((prev) => ({ ...prev, [currentId]: {} }));
        setEtiquetaEditTextById((prev) => ({ ...prev, [currentId]: {} }));
        setEtiquetaDraftOpenById((prev) => ({ ...prev, [currentId]: false }));
        setEtiquetaDraftById((prev) => ({ ...prev, [currentId]: '' }));
      }
      window.setTimeout(() => {
        setEtiquetasClosingId((prev) => (prev === currentId ? null : prev));
      }, 160);
    },
    [
      etiquetaDraftById,
      etiquetaDraftColorById,
      etiquetaPendingColorsById,
      etiquetaEditTextById,
      refreshReservaById,
    ]
  );

  useEffect(() => {
    if (!etiquetasPopoverId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (etiquetasPopoverRef.current && etiquetasPopoverRef.current.contains(target)) return;
      closeEtiquetasPopover(etiquetasPopoverId, true);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [etiquetasPopoverId, closeEtiquetasPopover]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (detailReservaId) {
      window.history.replaceState({}, '', `/dashboard/reservas/${detailReservaId}`);
    } else {
      window.history.replaceState({}, '', '/dashboard/reservas');
    }
  }, [detailReservaId]);

  const loadMoreCalendar = async (reset = false) => {
    if (!partnerIdRef.current) return;
    if (calendarLoading) return;
    setCalendarLoading(true);
    try {
      const cacheKey = getCalendarCacheKey();
      if (reset) {
        const cached = calendarCacheRef.current.get(cacheKey);
        if (cached) {
          setCalendarItems(cached.items);
          setCalendarCursor(cached.cursor);
          setCalendarHasMore(cached.hasMore);
          return;
        }
      }
      const { from, to } = getCalendarRange();
      const result = await ReservasService.getReservasByRangePage({
        partnerId: partnerIdRef.current,
        filters: calendarFilter === 'all' ? undefined : [calendarFilter],
        restauranteId: restauranteFiltro.length ? restauranteFiltro : undefined,
        responsableIds: responsableFiltro.length ? responsableFiltro : undefined,
        sortBy,
        fechaDesde: format(from, 'yyyy-MM-dd'),
        fechaHasta: format(to, 'yyyy-MM-dd'),
        pageSize: 10,
        cursor: reset ? null : calendarCursor,
      });

      setCalendarCursor(result.cursor ?? null);
      setCalendarHasMore(result.hasMore);
      setCalendarItems((prev) => {
        if (reset) {
          const next = result.items;
          calendarCacheRef.current.set(cacheKey, {
            items: next,
            cursor: result.cursor ?? null,
            hasMore: result.hasMore,
            ts: Date.now(),
          });
          return next;
        }
        const ids = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        result.items.forEach((item) => {
          if (!ids.has(item.id)) merged.push(item);
        });
        calendarCacheRef.current.set(cacheKey, {
          items: merged,
          cursor: result.cursor ?? null,
          hasMore: result.hasMore,
          ts: Date.now(),
        });
        return merged;
      });
    } catch (err) {
      console.error('[reservas] calendar paged error', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (!partnerIdRef.current || vista !== 'calendario') return;
    setCalendarItems([]);
    setCalendarCursor(null);
    setCalendarHasMore(true);
    void loadMoreCalendar(true);
  }, [
    vista,
    mesVisible,
    rangoCalendario.from,
    rangoCalendario.to,
    restauranteFiltro,
    responsableFiltro,
    calendarFilter,
    sortBy,
    calendarRefresh,
  ]);

  const stats = useMemo(() => {
    const today = new Date();
    const hoy = reservas.reduce((acc, reserva) => {
      const fecha =
        toDate(reserva.fechaSolicitud) ||
        toDateFromKombo(reserva.kombo?.Fecha) ||
        toDate(reserva.fechaLimiteSala);
      return fecha && isSameDay(fecha, today) ? acc + 1 : acc;
    }, 0);

    return {
      ...counts,
      total: counts.requiereAccion + counts.pendientes + counts.confirmadas + counts.completadas + counts.expiradas,
      hoy,
    };
  }, [counts, reservas]);

  const countsTotal = useMemo(
    () => counts.requiereAccion + counts.pendientes + counts.confirmadas + counts.completadas + counts.expiradas,
    [counts]
  );

  const buildCountsFromAnalytics = (source?: Record<string, number>) => {
    const val = (key: string) => Number(source?.[key] ?? 0);
    return {
      requiereAccion:
        val('pendiente_disponibilidad') +
        val('pendiente_cambio') +
        val('no_gestionado') +
        val('expirada'),
      pendientes: val('pendiente_confirmacion') + val('cambio_rechazado'),
      confirmadas:
        val('confirmada') +
        val('confirmada_individual') +
        val('confirmada_pendiente_pago') +
        val('confirmada_periodo_pago') +
        val('confirmada_periodo_pago_concluido'),
      completadas: val('completada'),
      expiradas: val('fallada'),
    };
  };

  const statusKeysForFilter = (filter: ReservaFilterId | 'all') => {
    if (filter === 'all') return null;
    if (filter === 'requiereAccion') return ['pendiente_disponibilidad', 'pendiente_cambio', 'no_gestionado', 'expirada'];
    if (filter === 'pendientes') return ['pendiente_confirmacion', 'cambio_rechazado'];
    if (filter === 'confirmadas') {
      return [
        'confirmada',
        'confirmada_individual',
        'confirmada_pendiente_pago',
        'confirmada_periodo_pago',
        'confirmada_periodo_pago_concluido',
      ];
    }
    if (filter === 'completadas') return ['completada'];
    if (filter === 'expiradas') return ['fallada'];
    return null;
  };

  const sumAnalyticsForRange = (
    analyticsByDay: Record<
      string,
      {
        byStatus?: Record<string, number>;
        byRestaurante?: Record<string, { byStatus?: Record<string, number>; byResponsable?: Record<string, { byStatus?: Record<string, number> }> }>;
        byResponsable?: Record<string, { byStatus?: Record<string, number> }>;
      }
    >,
    from: Date,
    to: Date,
    restauranteIds?: string[],
    filter?: ReservaFilterId | 'all',
    responsableIds?: string[]
  ) => {
    const stats: Record<string, number> = {};
    const start = from < to ? from : to;
    const end = from < to ? to : from;
    const cursor = new Date(start);
    const allowed = statusKeysForFilter(filter ?? 'all');
    const restIds = restauranteIds?.length ? restauranteIds : null;
    const respIds = responsableIds?.length ? responsableIds : null;
    while (cursor <= end) {
      const key = format(cursor, 'yyyy-MM-dd');
      const dayPayload = analyticsByDay[key] ?? {};
      let sourceStats: Record<string, number> = {};

      if (restIds && respIds) {
        sourceStats = restIds.reduce((acc, restId) => {
          const byResp = dayPayload.byRestaurante?.[restId]?.byResponsable ?? {};
          respIds.forEach((respId) => {
            const map = byResp?.[respId]?.byStatus ?? {};
            Object.entries(map).forEach(([k, v]) => {
              acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
            });
          });
          return acc;
        }, {} as Record<string, number>);
      } else if (restIds) {
        sourceStats = restIds.reduce((acc, restId) => {
          const map = dayPayload.byRestaurante?.[restId]?.byStatus ?? {};
          Object.entries(map).forEach(([k, v]) => {
            acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
          });
          return acc;
        }, {} as Record<string, number>);
      } else if (respIds) {
        sourceStats = respIds.reduce((acc, respId) => {
          const map = dayPayload.byResponsable?.[respId]?.byStatus ?? {};
          Object.entries(map).forEach(([k, v]) => {
            acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
          });
          return acc;
        }, {} as Record<string, number>);
      } else {
        sourceStats = dayPayload.byStatus ?? {};
      }
      const dayStats = allowed
        ? Object.fromEntries(Object.entries(sourceStats).filter(([k]) => allowed.includes(k)))
        : sourceStats;
      Object.entries(dayStats).forEach(([status, count]) => {
        stats[status] = (stats[status] ?? 0) + Number(count ?? 0);
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return buildCountsFromAnalytics(stats);
  };

  const getMonthKeysBetween = (from: Date, to: Date) => {
    const keys: string[] = [];
    const start = startOfMonth(from < to ? from : to);
    const end = startOfMonth(from < to ? to : from);
    const cursor = new Date(start);
    while (cursor <= end) {
      keys.push(format(cursor, 'yyyy-MM'));
      cursor.setMonth(cursor.getMonth() + 1);
      cursor.setDate(1);
    }
    return keys;
  };

  const filteredReservas = useMemo(() => reservas, [reservas]);

  const calendarioReservas = useMemo(() => calendarItems, [calendarItems]);
  const formatCambioDate = useCallback((value?: string) => {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }, []);
  const formatCambioTime = useCallback((value?: string) => (value ? value : '--:--'), []);

  const calendarSummary = useMemo(() => {
    if (vista !== 'calendario') return '';
    const sortLabel = sortBy === 'fecha_asc' ? 'fecha asc' : 'fecha desc';
    const statusLabel =
      calendarFilter === 'all'
        ? 'Todas las reservas'
        : calendarFilter === 'requiereAccion'
        ? 'Reservas que requieren accion'
        : `Reservas ${FILTERS.find((f) => f.id === calendarFilter)?.label?.toLowerCase() ?? 'todas'}`;
    const restauranteLabel = restauranteFiltro.length
      ? `en ${restauranteFiltro.length} restaurante(s)`
      : 'en todos los restaurantes';
    const responsableLabel = responsableFiltro.length
      ? `con ${responsableFiltro
          .map((id) => responsables.find((resp) => resp.id === id)?.displayName || 'Responsable')
          .join(', ')}`
      : 'con todos los responsables';
    const rangeLabel = rangoCalendario.from || rangoCalendario.to
      ? `${format(rangoCalendario.from ?? rangoCalendario.to ?? mesVisible, 'dd/MM/yyyy', { locale: es })} - ${format(
          rangoCalendario.to ?? rangoCalendario.from ?? mesVisible,
          'dd/MM/yyyy',
          { locale: es }
        )}`
      : format(mesVisible, 'MMMM yyyy', { locale: es });

    return `${statusLabel} en orden ${sortLabel} ${restauranteLabel} ${responsableLabel} en las fechas ${rangeLabel}.`;
  }, [vista, sortBy, calendarFilter, restauranteFiltro, responsableFiltro, responsables, rangoCalendario.from, rangoCalendario.to, mesVisible, restaurantesById]);

  const calendarioDayStats = useMemo(() => {
    if (!monthDayStats) return {};
    const allowed = statusKeysForFilter(calendarFilter);
    console.log('[calendar] monthDayStats raw', monthDayStats);
    return Object.fromEntries(
      Object.entries(monthDayStats).map(([day, dayStats]) => {
        const stats = dayStats as {
          byStatus?: Record<string, number>;
          byRestaurante?: Record<
            string,
            { byStatus?: Record<string, number>; byResponsable?: Record<string, { byStatus?: Record<string, number> }> }
          >;
          byResponsable?: Record<string, { byStatus?: Record<string, number> }>;
        };
        const sourceStats = (() => {
          if (restauranteFiltro.length && responsableFiltro.length) {
            return restauranteFiltro.reduce((acc, id) => {
              const byResp = stats?.byRestaurante?.[id]?.byResponsable ?? {};
              responsableFiltro.forEach((respId) => {
                const map = byResp?.[respId]?.byStatus ?? {};
                Object.entries(map).forEach(([k, v]) => {
                  acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
                });
              });
              return acc;
            }, {} as Record<string, number>);
          }
          if (restauranteFiltro.length) {
            return restauranteFiltro.reduce((acc, id) => {
              const map = stats?.byRestaurante?.[id]?.byStatus ?? {};
              Object.entries(map).forEach(([k, v]) => {
                acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
              });
              return acc;
            }, {} as Record<string, number>);
          }
          if (responsableFiltro.length) {
            return responsableFiltro.reduce((acc, respId) => {
              const map = stats?.byResponsable?.[respId]?.byStatus ?? {};
              Object.entries(map).forEach(([k, v]) => {
                acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
              });
              return acc;
            }, {} as Record<string, number>);
          }
          return stats?.byStatus ?? {};
        })();
        const entries = Object.entries(sourceStats).filter(([key, value]) => {
          if (allowed && !allowed.includes(key)) return false;
          return Number(value ?? 0) > 0;
        });
        console.log('[calendar] day stats', { day, sourceStats, entries, allowed });
        return [
          day,
          entries
            .sort((a, b) => b[1] - a[1])
            .map(([estadoKey, count]) => ({
              color: estadoBarColor[estadoKey] ?? estadoBarColor.otro,
              count,
            })),
        ];
      })
    );
  }, [monthDayStats, restauranteFiltro, responsableFiltro, calendarFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-none flex-col items-start justify-between gap-4 px-4 py-6 sm:flex-row sm:items-center">
          <div className="w-full">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reservas</p>
            <h1 className="text-2xl font-semibold text-slate-900">Gestiona tus reservas</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
            <Button
              asChild
              className="w-full bg-[#7472fd] text-white hover:bg-[#5f5bf2] sm:w-auto sm:order-1"
            >
              <Link href="/dashboard/reservas/nueva" prefetch={false}>
                Añadir reserva
              </Link>
            </Button>
            <div className="relative grid h-10 w-full grid-cols-2 rounded-full border border-slate-200 bg-white p-1 sm:w-48 sm:order-2">
              <span
                className={`absolute inset-1 w-[calc(50%-0.25rem)] rounded-full bg-[#7472fd] shadow-sm transition-transform duration-300 ${
                  vista === 'calendario' ? 'translate-x-full' : ''
                }`}
              />
            <button
              type="button"
              onClick={() => setVista('lista')}
              className={`relative z-10 h-full rounded-full text-xs font-semibold transition-colors duration-300 ${
                vista === 'lista' ? 'text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => {
                setVista('calendario');
                setCalendarFilter('all');
              }}
              className={`relative z-10 h-full rounded-full text-xs font-semibold transition-colors duration-300 ${
                vista === 'calendario' ? 'text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Calendario
            </button>
            </div>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full px-0 pt-0 pb-0 flex-1 flex flex-col bg-slate-50 ${
          vista === 'lista' ? 'max-w-5xl' : 'max-w-none'
        }`}
      >
        {error && (
          <Card className="border-rose-200 bg-rose-50">
            <CardHeader>
              <CardTitle className="text-base text-rose-600">No pudimos cargar reservas</CardTitle>
              <CardDescription className="text-rose-500">{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {isLoading && (
          <div className="mb-6 h-8 w-56 animate-pulse rounded-2xl bg-white/70" />
        )}

        <div className="px-4 py-3 flex flex-col gap-2 md:sticky md:top-0 z-10 bg-slate-50">
          <div className="flex flex-wrap items-center gap-2">
            {vista === 'lista' &&
              FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    selectedFilter === filter.id
                      ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#3b3af2]'
                      : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {counts[filter.id] ?? 0}
                  </span>
                </button>
              ))}
            {vista === 'calendario' && (
              <>
                <button
                  type="button"
                  onClick={() => setCalendarFilter('all')}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    calendarFilter === 'all'
                      ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#3b3af2]'
                      : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                  }`}
                >
                  <span>Todos</span>
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {countsTotal}
                  </span>
                </button>
                {FILTERS.map((filter) => {
                  const active = calendarFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setCalendarFilter(filter.id)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        active
                          ? 'border-[#7472fd] bg-[#7472fd]/10 text-[#3b3af2]'
                          : 'border-slate-200 text-slate-600 hover:border-[#7472fd]/40'
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {counts[filter.id] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 cursor-pointer">
              <span className="text-slate-400">Ordenar</span>
              <select
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              >
                <option value="fecha_desc">Fecha (desc)</option>
                <option value="fecha_asc">Fecha (asc)</option>
                <option value="restaurante_asc" disabled={vista === 'calendario'}>Restaurante (A-Z)</option>
                <option value="restaurante_desc" disabled={vista === 'calendario'}>Restaurante (Z-A)</option>
              </select>
            </div>
            {restaurantes.length > 1 && (
              <div
                role="button"
                tabIndex={0}
                className="relative flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 cursor-pointer"
                onClick={() => {
                  setRestauranteDraft(restauranteFiltro);
                  setShowRestauranteDropdown((prev) => !prev);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setShowRestauranteDropdown((prev) => !prev);
                  }
                }}
              >
                <span className="text-slate-400">Restaurante</span>
                <span className="text-xs font-semibold text-slate-700">
                  {restauranteFiltro.length ? `${restauranteFiltro.length} seleccionados` : 'Todos'}
                </span>
                {showRestauranteDropdown && (
                  <div
                    className="absolute left-0 top-full z-20 mt-2 w-[260px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {restaurantes.map((rest) => {
                      const checked = restauranteDraft.includes(rest.id);
                      return (
                        <label
                          key={rest.id}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            style={{ accentColor: rest.color || '#7472fd' }}
                            onChange={() => {
                              setRestauranteDraft((prev) => {
                                if (checked) return prev.filter((id) => id !== rest.id);
                                if (prev.length >= 10) {
                                  alert('Máximo 10 restaurantes');
                                  return prev;
                                }
                                return [...prev, rest.id];
                              });
                            }}
                          />
                          <span>{rest.nombreRestaurante || 'Restaurante'}</span>
                        </label>
                      );
                    })}
                    <div className="mt-2 flex justify-between">
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-slate-500"
                        onClick={() => setRestauranteDraft([])}
                      >
                        Limpiar
                      </button>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[#7472fd]"
                        onClick={() => {
                          setRestauranteFiltro(restauranteDraft);
                          setShowRestauranteDropdown(false);
                        }}
                      >
                        Listo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {responsables.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                className="relative flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 cursor-pointer"
                onClick={() => {
                  setResponsableDraft(responsableFiltro);
                  setShowResponsableDropdown((prev) => !prev);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setShowResponsableDropdown((prev) => !prev);
                  }
                }}
              >
                <span className="text-slate-400">Responsable</span>
                <span className="text-xs font-semibold text-slate-700">
                  {responsableFiltro.length ? `${responsableFiltro.length} seleccionados` : 'Todos'}
                </span>
                {showResponsableDropdown && (
                  <div
                    className="absolute left-0 top-full z-20 mt-2 w-[260px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {responsables.map((resp) => {
                      const checked = responsableDraft.includes(resp.id);
                      return (
                        <label
                          key={resp.id}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setResponsableDraft((prev) => {
                                if (checked) return prev.filter((id) => id !== resp.id);
                                if (prev.length >= 10) {
                                  alert('Máximo 10 responsables');
                                  return prev;
                                }
                                return [...prev, resp.id];
                              });
                            }}
                          />
                          <span>{resp.displayName}</span>
                        </label>
                      );
                    })}
                    <div className="mt-2 flex justify-between">
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-slate-500"
                        onClick={() => setResponsableDraft([])}
                      >
                        Limpiar
                      </button>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[#7472fd]"
                        onClick={() => {
                          setResponsableFiltro(responsableDraft);
                          setShowResponsableDropdown(false);
                        }}
                      >
                        Listo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={Boolean(changeDialogReserva)}
          onOpenChange={(open) => {
            if (!open) setChangeDialogReserva(null);
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirmar cambio</DialogTitle>
              <DialogDescription>Revisa la solicitud y define una nueva fecha límite de pago.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {changeDialogReserva?.cambioSolicitado && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>
                      Fecha: {formatCambioDate(changeDialogReserva.cambioSolicitado?.fechaNueva)}
                    </span>
                    <span>
                      Hora: {formatCambioTime(changeDialogReserva.cambioSolicitado?.horaNueva)}
                      {changeDialogReserva.cambioSolicitado?.horaFinNueva
                        ? ` - ${formatCambioTime(changeDialogReserva.cambioSolicitado?.horaFinNueva)}`
                        : ''}
                    </span>
                    <span>Aforo: {changeDialogReserva.cambioSolicitado?.aforoNuevo ?? '—'}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700">Fecha límite de pago</label>
                <Input
                  type="date"
                  value={changeFechaLimite}
                  min={todayISO}
                  onChange={(event) => setChangeFechaLimite(event.target.value)}
                />
                {changeFechaError && <p className="mt-1 text-xs text-rose-600">{changeFechaError}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChangeDialogReserva(null)}>
                Cancelar
              </Button>
              <Button
                className="bg-emerald-500 text-white hover:bg-emerald-500"
                onClick={confirmChangeDialog}
              >
                Aceptar cambio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={emailFailDialog} onOpenChange={setEmailFailDialog}>
          <DialogContent className="max-w-md">
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
                  if (!expiredConfirmAction || !expiredConfirmReservaId) return;
                  await handleExpiredAction(expiredConfirmReservaId, expiredConfirmAction);
                  setExpiredConfirmOpen(false);
                  setExpiredConfirmAction(null);
                  setExpiredConfirmReservaId(null);
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="px-4 pb-0 mt-0 flex flex-col bg-slate-50">
          {vista === 'calendario' && calendarSummary && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">
              {calendarSummary}
            </div>
          )}
          {vista === 'calendario' ? (
            <Card className="border-none bg-slate-200/60 shadow-sm flex flex-col lg:flex-1 lg:min-h-0">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                      <CalendarDays className="h-4 w-4 text-[#7472fd]" />
                      Calendario de reservas
                    </CardTitle>
                    <CardDescription>Selecciona un rango de fechas para ver las reservas.</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {!rangoCalendario.from && !rangoCalendario.to && (
                      <span className="rounded-full bg-slate-200/70 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        Mostrando {format(mesVisible, 'MMMM yyyy', { locale: es })}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        rangoCalendario.from || rangoCalendario.to
                          ? 'bg-[#7472fd]/15 text-[#3b3af2] ring-1 ring-[#7472fd]/30'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {rangoCalendario.from
                        ? format(rangoCalendario.from, 'dd/MM/yyyy', { locale: es })
                        : 'Sin inicio'}
                      {rangoCalendario.to
                        ? ` - ${format(rangoCalendario.to, 'dd/MM/yyyy', { locale: es })}`
                        : ''}
                    </span>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                        rangoCalendario.from || rangoCalendario.to
                          ? 'bg-[#7472fd] text-white hover:bg-[#5f5bf2]'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-[#7472fd]/40 hover:text-[#3b3af2]'
                      }`}
                      onClick={() => {
                        setRangoCalendario({});
                        setFechaSeleccionada(null);
                      }}
                    >
                      Limpiar rango
                    </button>
                  </div>
                </div>
                {rangeWarning && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                    {rangeWarning}
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0 lg:flex-1 lg:min-h-0">
                <div className="grid gap-4 lg:grid-cols-[minmax(340px,480px)_1fr] lg:min-h-0">
                  <div className="self-start lg:sticky lg:top-28">
                    <div className="w-full rounded-3xl border border-slate-200 bg-white p-4">
                      <ReservasCalendar
                        locale={es}
                        selected={rangoCalendario}
                        month={mesVisible}
                        dayStats={calendarioDayStats}
                        onMonthChange={(nextMonth) => {
                          setMesVisible(startOfMonth(nextMonth));
                          if (!rangoCalendario.from && !rangoCalendario.to) {
                            setFechaSeleccionada(null);
                          }
                        }}
                        onSelect={(range) => {
                          if (!range) {
                            setRangoCalendario({});
                            setFechaSeleccionada(null);
                            setRangeWarning(null);
                            return;
                          }
                          if (range.from && range.to) {
                            const diffMs = Math.abs(range.to.getTime() - range.from.getTime());
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
                            if (diffDays > MAX_RANGE_DAYS) {
                              setRangeWarning(`El rango máximo es ${MAX_RANGE_DAYS} días.`);
                              return;
                            }
                          }
                          setRangeWarning(null);
                          setRangoCalendario(range);
                          if (range.from) setFechaSeleccionada(range.from);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col lg:min-h-0">
                    <div className="grid auto-rows-min items-start content-start gap-4 px-2 lg:overflow-y-auto lg:pr-1">
                {calendarioReservas.map((reserva) => {
              const fecha = toDate(reserva.fechaSolicitud) || toDateFromKombo(reserva.kombo?.Fecha);
              const chat = chats[reserva.id];
              const badge = getStatusBadge(reserva);
              return (
                  <Card
                    key={reserva.id}
                    className="border border-slate-200 bg-white py-1 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.22)]"
                  >
                      <CardContent className="flex flex-col gap-1 px-4 pt-3 pb-0 relative">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                          <div className="flex w-full items-center gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                                {badge.label}
                              </span>
                              {(() => {
                                const origen = getOrigenReserva(reserva, channelMap);
                                return (
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${origen.className}`}
                                  >
                                    {origen.label}
                                  </span>
                                );
                              })()}
                              {reserva.requiereAccionPartner && (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  Requiere acción
                                </span>
                              )}
                            </div>
                            <div className="absolute right-4 top-3 flex items-center gap-2">
                              <button
                                type="button"
                                className="relative rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100"
                                onClick={() =>
                                  setNotesTarget({
                                    id: reserva.id,
                                    notas: reserva.notasReserva ?? [],
                                    etiquetas: reserva.etiquetas ?? [],
                                  })
                                }
                                title="Notas"
                              >
                                <StickyNote className="h-3.5 w-3.5" />
                                {((reserva.notasReserva ?? []) as Array<Record<string, unknown>>).length > 0 && (
                                  <span className="absolute -right-2 -top-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#7472fd] px-1 text-[8px] font-semibold text-white">
                                    {((reserva.notasReserva ?? []) as Array<Record<string, unknown>>).length}
                                  </span>
                                )}
                              </button>
                                <div className="relative" ref={etiquetasPopoverId === reserva.id ? etiquetasPopoverRef : null}>
                                  <button
                                    type="button"
                                    className="relative rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100"
                                    onClick={() =>
                                      setEtiquetasPopoverId((prev) => {
                                        if (prev === reserva.id) {
                                          closeEtiquetasPopover(reserva.id, true);
                                          return null;
                                        }
                                        return reserva.id;
                                      })
                                    }
                                    title="Etiquetas"
                                  >
                                    <Tag className="h-3.5 w-3.5" />
                                    {((reserva.etiquetas ?? []) as Array<Record<string, unknown>>).length > 0 && (
                                      <span className="absolute -right-2 -top-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#7472fd] px-1 text-[8px] font-semibold text-white">
                                        {((reserva.etiquetas ?? []) as Array<Record<string, unknown>>).length}
                                      </span>
                                    )}
                                  </button>
                                {(etiquetasPopoverId === reserva.id || etiquetasClosingId === reserva.id) && (
                                  <div
                                    className={`absolute right-0 top-10 z-20 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-3 shadow-xl transition ${
                                      etiquetasPopoverId === reserva.id
                                        ? 'animate-in fade-in zoom-in-95 slide-in-from-top-1'
                                        : 'animate-out fade-out zoom-out-95 slide-out-to-top-1'
                                    }`}
                                  >
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                      Etiquetas
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {((reserva.etiquetas ?? []) as Array<Record<string, unknown>>).length === 0 && (
                                        <p className="text-xs text-slate-500">Sin etiquetas.</p>
                                      )}
                                      {((reserva.etiquetas ?? []) as Array<Record<string, unknown>>).map((tag, idx) => {
                                        const label = String(tag.texto ?? tag.nombre ?? '');
                                        const baseColor = typeof tag.color === 'number' ? tag.color : 0xff7472fd;
                                        const pendingColor =
                                          etiquetaPendingColorsById[reserva.id]?.[idx] ?? baseColor;
                                        const isEditing = etiquetaEditById[reserva.id]?.[idx] ?? false;
                                        const editText =
                                          etiquetaEditTextById[reserva.id]?.[idx] ?? label;
                                        return (
                                          <span
                                            key={`${label}-${idx}`}
                                            className="group relative inline-flex min-w-[96px] items-center rounded-full px-2 py-1 text-[11px] font-semibold text-slate-900 transition"
                                            style={{ backgroundColor: colorToSoft(pendingColor) }}
                                          >
                                            {!isEditing && (
                                              <>
                                                <span className="transition group-hover:opacity-0">#{label || 'Etiqueta'}</span>
                                                <span className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition group-hover:opacity-100">
                                                  <button
                                                    type="button"
                                                    className="h-5 w-5 rounded-full border border-white/80"
                                                    style={{ backgroundColor: colorToRgba(pendingColor).fill }}
                                                    onClick={() => {
                                                      const palette = [0xff7472fd, 0xffffe100, 0xff10b981, 0xfff97316, 0xfff43f5e];
                                                      const currentIndex = palette.indexOf(pendingColor);
                                                      const nextColor = palette[(currentIndex + 1) % palette.length];
                                                      setEtiquetaPendingColorsById((prev) => ({
                                                        ...prev,
                                                        [reserva.id]: {
                                                          ...(prev[reserva.id] ?? {}),
                                                          [idx]: nextColor,
                                                        },
                                                      }));
                                                    }}
                                                    title="Cambiar color"
                                                  />
                                                  <button
                                                    type="button"
                                                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] text-slate-700"
                                                    onClick={() => {
                                                      setEtiquetaEditById((prev) => ({
                                                        ...prev,
                                                        [reserva.id]: { ...(prev[reserva.id] ?? {}), [idx]: true },
                                                      }));
                                                      setEtiquetaEditTextById((prev) => ({
                                                        ...prev,
                                                        [reserva.id]: {
                                                          ...(prev[reserva.id] ?? {}),
                                                          [idx]: label,
                                                        },
                                                      }));
                                                    }}
                                                    title="Editar"
                                                  >
                                                    ✎
                                                  </button>
                                                </span>
                                              </>
                                            )}
                                            {isEditing && (
                                              <span className="flex items-center gap-1">
                                                #
                                                <input
                                                  value={editText}
                                                  onChange={(event) =>
                                                    setEtiquetaEditTextById((prev) => ({
                                                      ...prev,
                                                      [reserva.id]: {
                                                        ...(prev[reserva.id] ?? {}),
                                                        [idx]: event.target.value,
                                                      },
                                                    }))
                                                  }
                                                  placeholder="Etiqueta"
                                                  className="w-20 bg-transparent text-[11px] font-semibold text-slate-900 outline-none"
                                                  onBlur={() => {
                                                    const text = (etiquetaEditTextById[reserva.id]?.[idx] ?? '').trim();
                                                    setEtiquetaEditById((prev) => ({
                                                      ...prev,
                                                      [reserva.id]: { ...(prev[reserva.id] ?? {}), [idx]: false },
                                                    }));
                                                    if (!text) return;
                                                    void ReservaDetalleService.updateEtiquetaTexto(reserva.id, idx, text).then(
                                                      () => void refreshReservaById(reserva.id)
                                                    );
                                                  }}
                                                />
                                                <button
                                                  type="button"
                                                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-rose-500"
                                                  onClick={() => {
                                                    void ReservaDetalleService.deleteEtiqueta(reserva.id, idx).then(() => {
                                                      void refreshReservaById(reserva.id);
                                                    });
                                                  }}
                                                  title="Eliminar"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              </span>
                                            )}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    <div className="mt-3 flex items-center justify-end gap-2">
                                      {etiquetaDraftOpenById[reserva.id] && (
                                        <div className="flex items-center gap-2 transition-all duration-300 ease-out animate-in slide-in-from-right-2 fade-in-0">
                                          <input
                                            autoFocus
                                            value={etiquetaDraftById[reserva.id] ?? ''}
                                            onChange={(event) =>
                                              setEtiquetaDraftById((prev) => ({
                                                ...prev,
                                                [reserva.id]: event.target.value,
                                              }))
                                            }
                                            onKeyDown={async (event) => {
                                              if (event.key !== 'Enter') return;
                                              event.preventDefault();
                                              const texto = (etiquetaDraftById[reserva.id] ?? '').trim();
                                              if (!texto) return;
                                              const color = etiquetaDraftColorById[reserva.id] ?? 0xff7472fd;
                                              await ReservaDetalleService.addEtiqueta(reserva.id, { texto, color });
                                              setEtiquetaDraftById((prev) => ({ ...prev, [reserva.id]: '' }));
                                              setEtiquetaDraftOpenById((prev) => ({
                                                ...prev,
                                                [reserva.id]: false,
                                              }));
                                              void refreshReservaById(reserva.id);
                                            }}
                                            onBlur={() => {
                                              setEtiquetaDraftOpenById((prev) => ({
                                                ...prev,
                                                [reserva.id]: false,
                                              }));
                                            }}
                                            placeholder="Etiqueta"
                                            className="h-7 w-32 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm outline-none transition-all duration-200 ease-out focus:border-[#7472fd] focus:ring-2 focus:ring-[#7472fd]/15"
                                          />
                                          <button
                                            type="button"
                                            className="h-5 w-5 rounded-full border border-white/80 shadow-sm"
                                            style={{
                                              backgroundColor: colorToRgba(
                                                etiquetaDraftColorById[reserva.id] ?? 0xff7472fd
                                              ).fill,
                                            }}
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => {
                                              const palette = [0xff7472fd, 0xffffe100, 0xff10b981, 0xfff97316, 0xfff43f5e];
                                              const current = etiquetaDraftColorById[reserva.id] ?? 0xff7472fd;
                                              const currentIndex = palette.indexOf(current);
                                              const nextColor = palette[(currentIndex + 1) % palette.length];
                                              setEtiquetaDraftColorById((prev) => ({
                                                ...prev,
                                                [reserva.id]: nextColor,
                                              }));
                                            }}
                                            title="Cambiar color"
                                          />
                                          <button
                                            type="button"
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7472fd] text-white"
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={async () => {
                                              const texto = (etiquetaDraftById[reserva.id] ?? '').trim();
                                              if (!texto) {
                                                setEtiquetaDraftOpenById((prev) => ({
                                                  ...prev,
                                                  [reserva.id]: false,
                                                }));
                                                return;
                                              }
                                              const color = etiquetaDraftColorById[reserva.id] ?? 0xff7472fd;
                                              await ReservaDetalleService.addEtiqueta(reserva.id, { texto, color });
                                              setEtiquetaDraftById((prev) => ({ ...prev, [reserva.id]: '' }));
                                              setEtiquetaDraftOpenById((prev) => ({
                                                ...prev,
                                                [reserva.id]: false,
                                              }));
                                              void refreshReservaById(reserva.id);
                                            }}
                                            title="Guardar etiqueta"
                                          >
                                            <ArrowUp className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                      {!etiquetaDraftOpenById[reserva.id] && (
                                      <button
                                        type="button"
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7472fd] text-white"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={async () => {
                                          setEtiquetaDraftOpenById((prev) => ({
                                            ...prev,
                                            [reserva.id]: true,
                                          }));
                                          setEtiquetaDraftColorById((prev) => ({
                                            ...prev,
                                            [reserva.id]: prev[reserva.id] ?? 0xff7472fd,
                                          }));
                                        }}
                                        title="Añadir etiqueta"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5" />
                              {reserva.usuario?.['Nombre de usuario'] || 'Cliente'}
                            </span>
                            <span className="flex items-center gap-2">
                              <Utensils
                                className="h-3.5 w-3.5"
                                style={{
                                  color:
                                    restaurantesById.get(reserva.restaurante?.id ?? '')?.color || undefined,
                                }}
                              />
                              <span
                                style={{
                                  color:
                                    restaurantesById.get(reserva.restaurante?.id ?? '')?.color || undefined,
                                }}
                              >
                                {reserva.restaurante?.['Nombre del restaurante'] || 'Restaurante'}
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5" />
                              {fecha ? fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sin fecha'}
                            </span>
                            <span className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              {reserva.kombo?.Hora || '--:--'}
                              {reserva.kombo?.horaFin && reserva.kombo?.horaFin !== reserva.kombo?.Hora
                                ? ` - ${reserva.kombo?.horaFin}`
                                : ''}
                            </span>
                            <span className="flex items-center gap-2">
                              <Package className="h-3.5 w-3.5" />
                              {getPlanLabel(reserva)}
                            </span>
                            {(reserva as { responsableEquipo?: { nombre?: string } | null })?.responsableEquipo
                              ?.nombre && (
                              <span className="flex items-center gap-2">
                                <UserCheck className="h-3.5 w-3.5" />
                                {(reserva as { responsableEquipo?: { nombre?: string } | null })?.responsableEquipo
                                  ?.nombre}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2 pr-0">
                        <Button
                          variant="link"
                          size="sm"
                          className="px-0 text-[11px] font-semibold text-slate-600 underline underline-offset-4"
                          onClick={() => setDetailReservaId(reserva.id)}
                        >
                          Ver detalles
                        </Button>
                        {reserva.estado?.toLowerCase() === 'pendiente' && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <PendienteActionsDialog reserva={reserva} onCompleted={handleReservaActionCompleted} />
                          </div>
                        )}
                        {reserva.estado?.toLowerCase() === 'pendientecambio' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-emerald-500 text-white hover:bg-emerald-500"
                              disabled={Boolean(changeActionById[reserva.id])}
                              onClick={() => openChangeDialog(reserva)}
                            >
                              {changeActionById[reserva.id] === 'accept' ? 'Aceptando...' : 'Aceptar cambio'}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-rose-500 text-white hover:bg-rose-500"
                              disabled={Boolean(changeActionById[reserva.id])}
                              onClick={() => handleChangeRequestAction(reserva.id, 'reject')}
                            >
                              {changeActionById[reserva.id] === 'reject' ? 'Rechazando...' : 'Rechazar'}
                            </Button>
                          </div>
                        )}
                        {reserva.estado?.toLowerCase() === 'expirado' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-emerald-500 text-white hover:bg-emerald-500"
                              disabled={Boolean(expiredActionById[reserva.id])}
                              onClick={() => {
                                setExpiredConfirmReservaId(reserva.id);
                                setExpiredConfirmAction('confirm');
                                setExpiredConfirmOpen(true);
                              }}
                            >
                              {expiredActionById[reserva.id] === 'confirm' ? 'Confirmando...' : 'Confirmada con cliente'}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-rose-500 text-white hover:bg-rose-500"
                              disabled={Boolean(expiredActionById[reserva.id])}
                              onClick={() => {
                                setExpiredConfirmReservaId(reserva.id);
                                setExpiredConfirmAction('cancel');
                                setExpiredConfirmOpen(true);
                              }}
                            >
                              {expiredActionById[reserva.id] === 'cancel' ? 'Cancelando...' : 'Cancelar definitivamente'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
              );
                })}
                {calendarioReservas.length === 0 && !calendarLoading && (
                  <Card className="border-dashed border-slate-200 bg-white">
                    <CardContent className="py-10 text-center text-sm text-slate-500">
                      No hay reservas con este filtro.
                    </CardContent>
                  </Card>
                )}
                {calendarHasMore && (
                  <div ref={calendarLoaderRef} className="h-6 w-full" />
                )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-4 flex flex-col">
              <div className="grid auto-rows-min items-start content-start gap-4 px-2 md:overflow-y-auto">
              {filteredReservas.map((reserva) => {
                const fecha = toDate(reserva.fechaSolicitud) || toDateFromKombo(reserva.kombo?.Fecha);
                const chat = chats[reserva.id];
                const badge = getStatusBadge(reserva);
                return (
                  <Card
                    key={reserva.id}
                    className="border border-slate-200 bg-white py-1 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.22)]"
                  >
                      <CardContent className="flex flex-col gap-1 px-4 pt-3 pb-0 relative">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                          <div className="flex w-full items-center gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                                {badge.label}
                              </span>
                              {(() => {
                                const origen = getOrigenReserva(reserva, channelMap);
                                return (
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${origen.className}`}
                                  >
                                    {origen.label}
                                  </span>
                                );
                              })()}
                              {reserva.requiereAccionPartner && (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  Requiere acción
                                </span>
                              )}
                            </div>
                            <div className="absolute right-4 top-3 flex items-center gap-2">
                              <button
                                type="button"
                                className="relative rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100"
                                onClick={() =>
                                  setNotesTarget({
                                    id: reserva.id,
                                    notas: reserva.notasReserva ?? [],
                                    etiquetas: reserva.etiquetas ?? [],
                                  })
                                }
                                title="Notas"
                              >
                                <StickyNote className="h-3.5 w-3.5" />
                                {((reserva.notasReserva ?? []) as Array<Record<string, unknown>>).length > 0 && (
                                  <span className="absolute -right-2 -top-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#7472fd] px-1 text-[8px] font-semibold text-white">
                                    {((reserva.notasReserva ?? []) as Array<Record<string, unknown>>).length}
                                  </span>
                                )}
                              </button>
                                <div className="relative" ref={etiquetasPopoverId === reserva.id ? etiquetasPopoverRef : null}>
                                  <button
                                    type="button"
                                    className="relative rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100"
                                    onClick={() =>
                                      setEtiquetasPopoverId((prev) => {
                                        if (prev === reserva.id) {
                                          closeEtiquetasPopover(reserva.id, true);
                                          return null;
                                        }
                                        return reserva.id;
                                      })
                                    }
                                    title="Etiquetas"
                                  >
                                    <Tag className="h-3.5 w-3.5" />
                                    {((reserva.etiquetas ?? []) as Array<Record<string, unknown>>).length > 0 && (
                                      <span className="absolute -right-2 -top-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#7472fd] px-1 text-[8px] font-semibold text-white">
                                        {((reserva.etiquetas ?? []) as Array<Record<string, unknown>>).length}
                                      </span>
                                    )}
                                  </button>
                                {(etiquetasPopoverId === reserva.id || etiquetasClosingId === reserva.id) && (
                                  <div
                                    className={`absolute right-0 top-10 z-20 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-3 shadow-xl transition ${
                                      etiquetasPopoverId === reserva.id
                                        ? 'animate-in fade-in zoom-in-95 slide-in-from-top-1'
                                        : 'animate-out fade-out zoom-out-95 slide-out-to-top-1'
                                    }`}
                                  >
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                      Etiquetas
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {((reserva.etiquetas ?? []) as Array<Record<string, unknown>>).length === 0 && (
                                        <p className="text-xs text-slate-500">Sin etiquetas.</p>
                                      )}
                                      {((reserva.etiquetas ?? []) as Array<Record<string, unknown>>).map((tag, idx) => {
                                        const label = String(tag.texto ?? tag.nombre ?? '');
                                        const baseColor = typeof tag.color === 'number' ? tag.color : 0xff7472fd;
                                        const pendingColor =
                                          etiquetaPendingColorsById[reserva.id]?.[idx] ?? baseColor;
                                        const isEditing = etiquetaEditById[reserva.id]?.[idx] ?? false;
                                        const editText =
                                          etiquetaEditTextById[reserva.id]?.[idx] ?? label;
                                        return (
                                          <span
                                            key={`${label}-${idx}`}
                                            className="group relative inline-flex min-w-[96px] items-center rounded-full px-2 py-1 text-[11px] font-semibold text-slate-900 transition"
                                            style={{ backgroundColor: colorToSoft(pendingColor) }}
                                          >
                                            {!isEditing && (
                                              <>
                                                <span className="transition group-hover:opacity-0">#{label || 'Etiqueta'}</span>
                                                <span className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition group-hover:opacity-100">
                                                  <button
                                                    type="button"
                                                    className="h-5 w-5 rounded-full border border-white/80"
                                                    style={{ backgroundColor: colorToRgba(pendingColor).fill }}
                                                    onClick={() => {
                                                      const palette = [0xff7472fd, 0xffffe100, 0xff10b981, 0xfff97316, 0xfff43f5e];
                                                      const currentIndex = palette.indexOf(pendingColor);
                                                      const nextColor = palette[(currentIndex + 1) % palette.length];
                                                      setEtiquetaPendingColorsById((prev) => ({
                                                        ...prev,
                                                        [reserva.id]: {
                                                          ...(prev[reserva.id] ?? {}),
                                                          [idx]: nextColor,
                                                        },
                                                      }));
                                                    }}
                                                    title="Cambiar color"
                                                  />
                                                  <button
                                                    type="button"
                                                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] text-slate-700"
                                                    onClick={() => {
                                                      setEtiquetaEditById((prev) => ({
                                                        ...prev,
                                                        [reserva.id]: { ...(prev[reserva.id] ?? {}), [idx]: true },
                                                      }));
                                                      setEtiquetaEditTextById((prev) => ({
                                                        ...prev,
                                                        [reserva.id]: {
                                                          ...(prev[reserva.id] ?? {}),
                                                          [idx]: label,
                                                        },
                                                      }));
                                                    }}
                                                    title="Editar"
                                                  >
                                                    ✎
                                                  </button>
                                                </span>
                                              </>
                                            )}
                                            {isEditing && (
                                              <span className="flex items-center gap-1">
                                                #
                                                <input
                                                  value={editText}
                                                  onChange={(event) =>
                                                    setEtiquetaEditTextById((prev) => ({
                                                      ...prev,
                                                      [reserva.id]: {
                                                        ...(prev[reserva.id] ?? {}),
                                                        [idx]: event.target.value,
                                                      },
                                                    }))
                                                  }
                                                  placeholder="Etiqueta"
                                                  className="w-20 bg-transparent text-[11px] font-semibold text-slate-900 outline-none"
                                                  onBlur={() => {
                                                    const text = (etiquetaEditTextById[reserva.id]?.[idx] ?? '').trim();
                                                    setEtiquetaEditById((prev) => ({
                                                      ...prev,
                                                      [reserva.id]: { ...(prev[reserva.id] ?? {}), [idx]: false },
                                                    }));
                                                    if (!text) return;
                                                    void ReservaDetalleService.updateEtiquetaTexto(reserva.id, idx, text).then(
                                                      () => void refreshReservaById(reserva.id)
                                                    );
                                                  }}
                                                />
                                                <button
                                                  type="button"
                                                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-rose-500"
                                                  onClick={() => {
                                                    void ReservaDetalleService.deleteEtiqueta(reserva.id, idx).then(() => {
                                                      void refreshReservaById(reserva.id);
                                                    });
                                                  }}
                                                  title="Eliminar"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              </span>
                                            )}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    <div className="mt-3 flex items-center justify-end gap-2">
                                      {!etiquetaDraftOpenById[reserva.id] && (
                                      <button
                                        type="button"
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7472fd] text-white"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={async () => {
                                          setEtiquetaDraftOpenById((prev) => ({
                                            ...prev,
                                            [reserva.id]: true,
                                          }));
                                          setEtiquetaDraftColorById((prev) => ({
                                            ...prev,
                                            [reserva.id]: prev[reserva.id] ?? 0xff7472fd,
                                          }));
                                        }}
                                        title="Añadir etiqueta"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                      )}
                                      {etiquetaDraftOpenById[reserva.id] && (
                                        <div className="flex items-center gap-2 transition-all duration-300 ease-out animate-in slide-in-from-right-2 fade-in-0">
                                          <input
                                            autoFocus
                                            value={etiquetaDraftById[reserva.id] ?? ''}
                                          onChange={(event) =>
                                            setEtiquetaDraftById((prev) => ({
                                              ...prev,
                                              [reserva.id]: event.target.value,
                                            }))
                                          }
                                          onKeyDown={async (event) => {
                                            if (event.key !== 'Enter') return;
                                            event.preventDefault();
                                            const texto = (etiquetaDraftById[reserva.id] ?? '').trim();
                                            if (!texto) return;
                                            const color = etiquetaDraftColorById[reserva.id] ?? 0xff7472fd;
                                            await ReservaDetalleService.addEtiqueta(reserva.id, { texto, color });
                                            setEtiquetaDraftById((prev) => ({ ...prev, [reserva.id]: '' }));
                                            setEtiquetaDraftOpenById((prev) => ({
                                              ...prev,
                                              [reserva.id]: false,
                                            }));
                                            void refreshReservaById(reserva.id);
                                            }}
                                            onBlur={() => {
                                              setEtiquetaDraftOpenById((prev) => ({
                                                ...prev,
                                                [reserva.id]: false,
                                              }));
                                            }}
                                            placeholder="Etiqueta"
                                            className="h-7 w-36 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm outline-none transition-all duration-200 ease-out focus:border-[#7472fd] focus:ring-2 focus:ring-[#7472fd]/15"
                                          />
                                          <button
                                            type="button"
                                            className="h-5 w-5 rounded-full border border-white/80 shadow-sm"
                                            style={{
                                              backgroundColor: colorToRgba(
                                                etiquetaDraftColorById[reserva.id] ?? 0xff7472fd
                                              ).fill,
                                            }}
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => {
                                              const palette = [0xff7472fd, 0xffffe100, 0xff10b981, 0xfff97316, 0xfff43f5e];
                                              const current = etiquetaDraftColorById[reserva.id] ?? 0xff7472fd;
                                              const currentIndex = palette.indexOf(current);
                                              const nextColor = palette[(currentIndex + 1) % palette.length];
                                              setEtiquetaDraftColorById((prev) => ({
                                                ...prev,
                                                [reserva.id]: nextColor,
                                              }));
                                            }}
                                            title="Cambiar color"
                                          />
                                          <button
                                            type="button"
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7472fd] text-white"
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={async () => {
                                              const texto = (etiquetaDraftById[reserva.id] ?? '').trim();
                                              if (!texto) {
                                                setEtiquetaDraftOpenById((prev) => ({
                                                  ...prev,
                                                  [reserva.id]: false,
                                                }));
                                                return;
                                              }
                                              const color = etiquetaDraftColorById[reserva.id] ?? 0xff7472fd;
                                              await ReservaDetalleService.addEtiqueta(reserva.id, { texto, color });
                                              setEtiquetaDraftById((prev) => ({ ...prev, [reserva.id]: '' }));
                                              setEtiquetaDraftOpenById((prev) => ({
                                                ...prev,
                                                [reserva.id]: false,
                                              }));
                                              void refreshReservaById(reserva.id);
                                            }}
                                            title="Guardar etiqueta"
                                          >
                                            <ArrowUp className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5" />
                                {reserva.usuario?.['Nombre de usuario'] || 'Cliente'}
                              </span>
                              <span className="flex items-center gap-2">
                                <Utensils
                                  className="h-3.5 w-3.5"
                                  style={{
                                    color:
                                      restaurantesById.get(reserva.restaurante?.id ?? '')?.color || undefined,
                                  }}
                                />
                                <span
                                  style={{
                                    color:
                                      restaurantesById.get(reserva.restaurante?.id ?? '')?.color || undefined,
                                  }}
                                >
                                  {reserva.restaurante?.['Nombre del restaurante'] || 'Restaurante'}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                {fecha
                                  ? fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                  : 'Sin fecha'}
                              </span>
                              <span className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                {reserva.kombo?.Hora || '--:--'}
                                {reserva.kombo?.horaFin && reserva.kombo?.horaFin !== reserva.kombo?.Hora
                                  ? ` - ${reserva.kombo?.horaFin}`
                                  : ''}
                              </span>
                              <span className="flex items-center gap-2">
                                <Package className="h-3.5 w-3.5" />
                              {getPlanLabel(reserva)}
                            </span>
                            {(reserva as { responsableEquipo?: { nombre?: string } | null })?.responsableEquipo
                              ?.nombre && (
                              <span className="flex items-center gap-2">
                                <UserCheck className="h-3.5 w-3.5" />
                                {(reserva as { responsableEquipo?: { nombre?: string } | null })?.responsableEquipo
                                  ?.nombre}
                              </span>
                            )}
                            </div>
                          </div>
                        </div>
                      <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2 pr-0">
                          <Button
                            variant="link"
                            size="sm"
                            className="px-0 text-[11px] font-semibold text-slate-600 underline underline-offset-4"
                            onClick={() => setDetailReservaId(reserva.id)}
                          >
                            Ver detalles
                          </Button>
                          {reserva.estado?.toLowerCase() === 'pendiente' && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <PendienteActionsDialog reserva={reserva} onCompleted={handleReservaActionCompleted} />
                            </div>
                          )}
                          {reserva.estado?.toLowerCase() === 'pendientecambio' && (
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-emerald-500 text-white hover:bg-emerald-500"
                                disabled={Boolean(changeActionById[reserva.id])}
                                onClick={() => openChangeDialog(reserva)}
                              >
                                {changeActionById[reserva.id] === 'accept' ? 'Aceptando...' : 'Aceptar cambio'}
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-rose-500 text-white hover:bg-rose-500"
                                disabled={Boolean(changeActionById[reserva.id])}
                                onClick={() => handleChangeRequestAction(reserva.id, 'reject')}
                              >
                                {changeActionById[reserva.id] === 'reject' ? 'Rechazando...' : 'Rechazar'}
                              </Button>
                            </div>
                          )}
                          {reserva.estado?.toLowerCase() === 'expirado' && (
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-emerald-500 text-white hover:bg-emerald-500"
                                disabled={Boolean(expiredActionById[reserva.id])}
                                onClick={() => {
                                  setExpiredConfirmReservaId(reserva.id);
                                  setExpiredConfirmAction('confirm');
                                  setExpiredConfirmOpen(true);
                                }}
                              >
                                {expiredActionById[reserva.id] === 'confirm' ? 'Confirmando...' : 'Confirmada con cliente'}
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-rose-500 text-white hover:bg-rose-500"
                                disabled={Boolean(expiredActionById[reserva.id])}
                                onClick={() => {
                                  setExpiredConfirmReservaId(reserva.id);
                                  setExpiredConfirmAction('cancel');
                                  setExpiredConfirmOpen(true);
                                }}
                              >
                                {expiredActionById[reserva.id] === 'cancel' ? 'Cancelando...' : 'Cancelar definitivamente'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                );
              })}
              {filteredReservas.length === 0 && (
                <Card className="border-dashed border-slate-200 bg-white">
                  <CardContent className="py-10 text-center text-sm text-slate-500">
                    No hay reservas con este filtro.
                  </CardContent>
                </Card>
              )}
              <div ref={loaderRef} className="h-6" />
              {isLoadingMore && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  Cargando más reservas...
                </div>
              )}
              {!hasMore && !isLoadingMore && filteredReservas.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 text-center text-xs text-slate-400">
                  No hay más reservas para mostrar.
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Sheet
        modal={false}
        open={Boolean(detailReservaId)}
        onOpenChange={(open) => {
          if (!open) {
            const currentId = detailReservaId;
            setDetailReservaId(null);
            void refreshReservaById(currentId);
          }
        }}
      >
        <SheetContent
          side="right"
          className="!right-0 !w-auto !max-w-none p-0 data-[state=open]:duration-0 data-[state=closed]:duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
          style={{
            left: 0,
            right: 0,
            width: 'auto',
          }}
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Detalle de reserva</SheetTitle>
          <ReservaDetalleContent
            reservaId={detailReservaId}
            variant="panel"
            onClose={() => {
              const currentId = detailReservaId;
              setDetailReservaId(null);
              void refreshReservaById(currentId);
            }}
          />
        </SheetContent>
      </Sheet>

      {notesTarget && (
        <NotasEtiquetasModals
          reservaId={notesTarget.id}
          notasRaw={notesTarget.notas}
          etiquetasRaw={notesTarget.etiquetas}
          openNotas={Boolean(notesTarget)}
          openEtiquetas={false}
          onCloseNotas={() => setNotesTarget(null)}
          onCloseEtiquetas={() => setTagsTarget(null)}
          onReload={() => void refreshReservaById(notesTarget.id)}
        />
      )}
      {tagsTarget && (
        <NotasEtiquetasModals
          reservaId={tagsTarget.id}
          notasRaw={tagsTarget.notas}
          etiquetasRaw={tagsTarget.etiquetas}
          openNotas={false}
          openEtiquetas={Boolean(tagsTarget)}
          onCloseNotas={() => setNotesTarget(null)}
          onCloseEtiquetas={() => setTagsTarget(null)}
          onReload={() => void refreshReservaById(tagsTarget.id)}
        />
      )}
    </div>
  );
}
