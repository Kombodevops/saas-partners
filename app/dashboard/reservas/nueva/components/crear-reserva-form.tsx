'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, Info, Mail, MapPin, Plus, Trash2, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { AuthService } from '@/lib/services/auth.service';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';
import { PackCatalogService, type PackCatalogItem } from '@/lib/services/pack-catalog.service';
import { ReservaCreateSchema, type ReservaCreateForm } from '@/lib/validators/reserva-create';
import { ReservaCreateService } from '@/lib/services/reserva-create.service';
import type { ConsumicionBarraForm } from '@/lib/validators/restaurante-barra';
import type { RacionForm } from '@/lib/validators/restaurante-raciones';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';
import { useRestaurantes } from '@/components/shared/restaurantes-context';
import { ElementoEditor } from '@/app/dashboard/reservas/nueva/components/elemento-editor';
import { TicketsEditor, type TicketItem } from '@/app/dashboard/reservas/nueva/components/tickets-editor';
import { RestauranteSalaSection } from '@/app/dashboard/reservas/nueva/components/restaurante-sala-section';
import { FechaSection } from '@/app/dashboard/reservas/nueva/components/fecha-section';
import { BarraLibreIntervalo } from '@/app/dashboard/reservas/nueva/components/barra-libre-intervalo';
import { CrearElementoModal } from '@/app/dashboard/reservas/nueva/components/crear-elemento-modal';
import { WorkersService } from '@/lib/services/workers.service';
import { AnalyticsChannelsService } from '@/lib/services/analytics-channels.service';

const TODAY = () => new Date().toISOString().split('T')[0];
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? '';

type QuestionType = 'string' | 'choice' | 'boolean';
type AdhocSource = 'plan_ticket' | 'barra' | 'racion' | 'manual';
type AdhocTipo = 'comida' | 'bebida';
type AdhocItem = {
  id: string;
  source: AdhocSource;
  tipo: AdhocTipo;
  name: string;
  quantity: number;
  price: number;
};

type QuestionItem = {
  id: string;
  question: string;
  question_type: QuestionType;
  required: boolean;
  options?: string[];
  optionDraft?: string;
};

const getPackLabel = (pack: PackCatalogItem) => {
  if (pack.Categoria === 'Menú') return 'Menú';
  if (pack.Categoria === 'Tickets') return 'Tickets';
  if (pack.Categoria === 'Best Deal' && pack.Subcategoria === 'Barra Libre') return 'Barra libre';
  return pack.Categoria || 'Plan';
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

const getAdhocSourceLabel = (source: AdhocSource) => {
  switch (source) {
    case 'plan_ticket':
      return 'Tickets de consumiciones';
    case 'barra':
      return 'Consumiciones en barra';
    case 'racion':
      return 'Raciones';
    default:
      return 'Manual';
  }
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

const filterElementsByRestaurant = (
  pack: PackCatalogItem,
  restauranteId: string
): Array<Record<string, unknown>> => {
  if (!restauranteId) return [];
  let elements: Array<Record<string, unknown>> = [];
  if (pack.Categoria === 'Menú') {
    elements = (pack.Menus ?? []) as Array<Record<string, unknown>>;
  } else if (pack.Categoria === 'Tickets') {
    elements = (pack.Tickets ?? []) as Array<Record<string, unknown>>;
  } else if (pack.Categoria === 'Best Deal' && pack.Subcategoria === 'Barra Libre') {
    elements = (pack['Barra Libre'] ?? []) as Array<Record<string, unknown>>;
  } else if (pack.Categoria === 'Cocktail') {
    elements = (pack.Cocktails ?? []) as Array<Record<string, unknown>>;
  }

  return elements.filter((element) => {
    const restaurantesIds = (element.restaurantesIds ?? []) as string[];
    if (restaurantesIds.includes(restauranteId)) return true;
    const disponibilidad = (element.disponibilidadPorRestaurante ?? []) as Array<Record<string, unknown>>;
    return disponibilidad.some((item) => item.restauranteId === restauranteId);
  });
};

const formatInterval = (interval: Record<string, unknown>) => {
  const min = String(interval.duracionMin ?? '');
  const max = String(interval.duracionMax ?? '');
  const precio = String(interval.precio ?? 0);
  return `${min} - ${max} (€${precio})`;
};

const getIntervalsForRestaurante = (element: Record<string, unknown>, restauranteId: string) => {
  const disponibilidad = (element.disponibilidadPorRestaurante ?? []) as Array<Record<string, unknown>>;
  const match = disponibilidad.find((item) => item.restauranteId === restauranteId);
  const intervalos = (match?.intervalos ?? element.intervalos ?? []) as Array<Record<string, unknown>>;
  return intervalos;
};


export function CrearReservaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [packs, setPacks] = useState<PackCatalogItem[]>([]);
  const [restauranteDetalle, setRestauranteDetalle] = useState<RestauranteDetalleDoc | null>(null);
  const [salas, setSalas] = useState<NonNullable<RestauranteDetalleDoc['salas']>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<PackCatalogItem | null>(null);
  const [selectedElement, setSelectedElement] = useState<Record<string, unknown> | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<Record<string, unknown> | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<TicketItem[]>([]);
  const [adhocItems, setAdhocItems] = useState<AdhocItem[]>([]);
  const [adhocPlanTicketId, setAdhocPlanTicketId] = useState('');
  const [adhocPlanTicketQty, setAdhocPlanTicketQty] = useState(1);
  const [adhocBarraId, setAdhocBarraId] = useState('');
  const [adhocBarraQty, setAdhocBarraQty] = useState(1);
  const [adhocRacionId, setAdhocRacionId] = useState('');
  const [adhocRacionQty, setAdhocRacionQty] = useState(1);
  const [adhocManualNombre, setAdhocManualNombre] = useState('');
  const [adhocManualQty, setAdhocManualQty] = useState(1);
  const [adhocManualPrecio, setAdhocManualPrecio] = useState<number | ''>('');
  const [adhocManualTipo, setAdhocManualTipo] = useState<AdhocTipo>('comida');
  const [elements, setElements] = useState<Array<Record<string, unknown>>>([]);
  const [saving, setSaving] = useState(false);
  const [responsables, setResponsables] = useState<
    Array<{ id: string; nombre: string; email?: string; role?: string }>
  >([]);
  const [canales, setCanales] = useState<string[]>([]);
  const [canalDraft, setCanalDraft] = useState('');
  const [savingCanal, setSavingCanal] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [canalDialogOpen, setCanalDialogOpen] = useState(false);
  const [customSalaEnabled, setCustomSalaEnabled] = useState(false);
  const [customSalaNombre, setCustomSalaNombre] = useState('');
  const [customSalaAforoMin, setCustomSalaAforoMin] = useState<number | ''>('');
  const [customSalaAforoMax, setCustomSalaAforoMax] = useState<number | ''>('');
  const [allowSinCompraOverride, setAllowSinCompraOverride] = useState(false);
  const [confirmSinCompraOpen, setConfirmSinCompraOpen] = useState(false);
  const [savingSinCompraSala, setSavingSinCompraSala] = useState(false);
  const [createdReservaId, setCreatedReservaId] = useState<string | null>(null);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [showPlanHint, setShowPlanHint] = useState(false);
  const planHintTimeout = useRef<number | null>(null);
  const { restaurantes, isLoading: restaurantesLoading } = useRestaurantes();
  const isLoading = loading || restaurantesLoading;

  const form = useForm<ReservaCreateForm>({
    resolver: zodResolver(ReservaCreateSchema) as unknown as import('react-hook-form').Resolver<ReservaCreateForm>,
    defaultValues: {
      restauranteId: searchParams.get('restauranteId') ?? '',
      salaId: '',
      packId: '',
      nombreUsuario: '',
      email: '',
      fecha: '',
      horaInicio: '',
      horaFin: '',
      fechaLimite: '',
      aforoMin: 1,
      aforoMax: 1,
      anticipoActivo: false,
      anticipoDescripcion: '',
      anticipoPrecio: 0,
      responsableId: '',
      canal: '',
    },
  });

  const watchRestauranteId = form.watch('restauranteId');
  const watchSalaId = form.watch('salaId');
  const watchPackId = form.watch('packId');
  const watchAforoMin = form.watch('aforoMin');
  const watchAforoMax = form.watch('aforoMax');
  const anticipoActivo = form.watch('anticipoActivo');
  const watchEmail = form.watch('email');
  const watchResponsableId = form.watch('responsableId');
  const watchCanal = form.watch('canal');
  const normalizedCanalDraft = canalDraft.trim();
  const watchNombreUsuario = form.watch('nombreUsuario');
  const watchFecha = form.watch('fecha');
  const watchFechaLimite = form.watch('fechaLimite');
  const watchHoraInicio = form.watch('horaInicio');
  const watchHoraFin = form.watch('horaFin');
  const watchAnticipoDescripcion = form.watch('anticipoDescripcion');
  const watchAnticipoPrecio = form.watch('anticipoPrecio');
  const isSinCompraPack = watchPackId === 'sin_compra_anticipada' || watchPackId === 'anticipo_por_persona';
  const isAnticipoPack = watchPackId === 'anticipo_por_persona';
  const isConsumoLibreSinAnticipo = watchPackId === 'sin_compra_anticipada' && !isAnticipoPack;
  const isAdhocPack = watchPackId === 'adhoc';
  const normalizedEmail = (watchEmail ?? '').trim();
  const emailInvalid =
    Boolean(normalizedEmail) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const handlePlanHint = () => {
    if (hasSala) return;
    setShowPlanHint(true);
    if (planHintTimeout.current) {
      window.clearTimeout(planHintTimeout.current);
    }
    planHintTimeout.current = window.setTimeout(() => {
      setShowPlanHint(false);
      planHintTimeout.current = null;
    }, 2000);
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length}`,
        question: '',
        question_type: 'string',
        required: false,
        options: [],
        optionDraft: '',
      },
    ]);
  };

  const updateQuestion = (id: string, patch: Partial<QuestionItem>) => {
    setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addOption = (id: string) => {
    setQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const value = (item.optionDraft ?? '').trim();
        if (!value || (item.options ?? []).includes(value)) return item;
        return { ...item, options: [...(item.options ?? []), value], optionDraft: '' };
      })
    );
  };

  const removeOption = (id: string, index: number) => {
    setQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, options: (item.options ?? []).filter((_, i) => i !== index) };
      })
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const partner = await AuthService.getCurrentPartner();
        if (!partner) {
          setError('No se pudo cargar el partner');
          return;
        }
        const packsData = await PackCatalogService.getPacksByOwnerId(partner.id);
        if (!active) return;
        setPacks(packsData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleAddCanal = async () => {
    const resolvedPartnerId = partnerId ?? (await AuthService.getCurrentPartnerId());
    if (!resolvedPartnerId || !normalizedCanalDraft) return;
    if (canales.some((c) => c.toLowerCase() === normalizedCanalDraft.toLowerCase())) {
      setCanalDraft('');
      form.setValue('canal', normalizedCanalDraft);
      setCanalDialogOpen(false);
      return;
    }
    setSavingCanal(true);
    try {
      await AnalyticsChannelsService.addChannel(resolvedPartnerId, normalizedCanalDraft);
      setCanales((prev) => [...prev, normalizedCanalDraft]);
      form.setValue('canal', normalizedCanalDraft);
      setCanalDraft('');
      setCanalDialogOpen(false);
    } finally {
      setSavingCanal(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const partner = await AuthService.getCurrentPartner();
      if (!partner) return;
      const [workers, channels] = await Promise.all([
        WorkersService.listWorkers(partner.id),
        AnalyticsChannelsService.getChannels(partner.id),
      ]);
      if (!active) return;
      setResponsables(
        workers
          .filter((worker) => worker.active)
          .map((worker) => ({
            id: worker.id,
            nombre: worker.nombre,
            email: worker.email,
            role: worker.role,
          }))
      );
      setCanales(channels);
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const loadRestaurante = async () => {
      if (!watchRestauranteId) {
        setRestauranteDetalle(null);
        setSalas([]);
        setAllowSinCompraOverride(false);
        return;
      }
      const detalle = await RestauranteDetalleService.getRestauranteById(watchRestauranteId);
      setRestauranteDetalle(detalle);
      setSalas(detalle?.salas ?? []);
      if (detalle?.salas?.length === 1) {
        form.setValue('salaId', detalle.salas[0]?.nombre ?? '');
      }
    };
    loadRestaurante();
  }, [watchRestauranteId, form]);

  useEffect(() => {
    if (!restaurantesLoading) return;
    if (watchRestauranteId && !restaurantes.some((rest) => rest.id === watchRestauranteId)) {
      form.setValue('restauranteId', '');
    }
  }, [restaurantesLoading, restaurantes, watchRestauranteId, form]);

  useEffect(() => {
    if (!watchPackId) {
      setSelectedPack(null);
      setSelectedElement(null);
      setSelectedInterval(null);
      setElements([]);
      setSelectedTickets([]);
      setAdhocItems([]);
      form.setValue('anticipoActivo', false);
      form.setValue('anticipoDescripcion', '');
      form.setValue('anticipoPrecio', 0);
      return;
    }

    if (isAdhocPack) {
      setSelectedPack(null);
      setSelectedElement(null);
      setSelectedInterval(null);
      setElements([]);
      setSelectedTickets([]);
      form.setValue('anticipoActivo', false);
      form.setValue('anticipoDescripcion', '');
      form.setValue('anticipoPrecio', 0);
      return;
    }

    if (isSinCompraPack) {
      setSelectedPack(null);
      setSelectedElement(null);
      setSelectedInterval(null);
      setElements([]);
      setSelectedTickets([]);
      setAdhocItems([]);
      form.setValue('anticipoActivo', isAnticipoPack);
      if (!isAnticipoPack) {
        form.setValue('anticipoDescripcion', '');
        form.setValue('anticipoPrecio', 0);
      }
      return;
    }

    const pack = packs.find((item) => item.id === watchPackId) ?? null;
    setSelectedPack(pack);
    if (pack && watchRestauranteId) {
      const available = filterElementsByRestaurant(pack, watchRestauranteId);
      setElements(available);
      if (pack.Categoria === 'Tickets') {
        setSelectedTickets(
          available.map((ticket) => ({
            ...ticket,
            quantity: Number((ticket as Record<string, unknown>).quantity ?? watchAforoMax ?? 1),
          }))
        );
        setSelectedElement(null);
      } else {
        setSelectedElement(null);
        setSelectedTickets([]);
      }
    } else {
      setElements([]);
      setSelectedElement(null);
      setSelectedTickets([]);
    }
    setSelectedInterval(null);
    form.setValue('anticipoActivo', false);
  }, [watchPackId, watchRestauranteId, packs, form, isSinCompraPack, isAnticipoPack, isAdhocPack]);

  type SalaItem = NonNullable<RestauranteDetalleDoc['salas']>[number];

  const selectedSala = useMemo(() => {
    if (customSalaEnabled) {
      if (!customSalaNombre) return null;
      return {
        nombre: customSalaNombre,
        aforoMinimo: typeof customSalaAforoMin === 'number' ? customSalaAforoMin : undefined,
        aforoMaximo: typeof customSalaAforoMax === 'number' ? customSalaAforoMax : undefined,
      } as SalaItem;
    }
    if (!watchSalaId) return null;
    return salas.find((sala) => sala.nombre === watchSalaId) ?? null;
  }, [customSalaEnabled, customSalaNombre, customSalaAforoMin, customSalaAforoMax, salas, watchSalaId]);

  useEffect(() => {
    if (selectedSala) {
      form.setValue('aforoMin', Number(selectedSala.aforoMinimo ?? 1));
      form.setValue('aforoMax', Number(selectedSala.aforoMaximo ?? 1));
    }
  }, [selectedSala, form]);

  const customSalaComplete = Boolean(
    customSalaEnabled &&
      customSalaNombre &&
      customSalaAforoMin !== '' &&
      customSalaAforoMax !== ''
  );
  const hasSala = Boolean(watchSalaId || customSalaEnabled);
  const allowSinCompra = customSalaEnabled ? true : Boolean(selectedSala?.permiteReservaSinCompraAnticipada);
  const canUseSinCompra = allowSinCompra || allowSinCompraOverride;
  const isRestauranteStepComplete = Boolean(
    watchRestauranteId && (customSalaEnabled ? customSalaComplete : Boolean(watchSalaId))
  );
  const selectedTicketsCount = selectedTickets.filter((ticket) => !ticket.disabled).length;
  const hasBarraLibreTiempo = Boolean((selectedInterval as Record<string, unknown> | null)?.tiempoSolicitado);
  const horarioClosingTime = useMemo(() => {
    if (!restauranteDetalle?.horario || !watchFecha) return null;
    const parsed = new Date(watchFecha);
    if (Number.isNaN(parsed.getTime())) return null;
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayKey = dayNames[parsed.getDay()];
    const horarioDia = (restauranteDetalle.horario as Record<string, { cerrado?: boolean; intervalos?: Array<Record<string, unknown>> } | undefined>)[dayKey];
    if (!horarioDia || horarioDia.cerrado) return null;
    const intervalos = Array.isArray(horarioDia.intervalos) ? horarioDia.intervalos : [];
    if (intervalos.length === 0) return null;
    const limitStart = 7 * 60;
    let maxMinutes: number | null = null;
    intervalos.forEach((intervalo) => {
      const rawFin = intervalo.horaFin as { toDate?: () => Date } | Date | string | undefined;
      let finDate: Date | null = null;
      if (rawFin && typeof (rawFin as { toDate?: () => Date }).toDate === 'function') {
        finDate = (rawFin as { toDate: () => Date }).toDate();
      } else if (rawFin instanceof Date) {
        finDate = rawFin;
      } else if (typeof rawFin === 'string') {
        finDate = new Date(rawFin);
      }
      if (!finDate || Number.isNaN(finDate.getTime())) return;
      let minutes = finDate.getHours() * 60 + finDate.getMinutes();
      if (minutes < limitStart) minutes += 24 * 60;
      maxMinutes = maxMinutes == null ? minutes : Math.max(maxMinutes, minutes);
    });
    if (maxMinutes == null) return null;
    const displayMinutes = maxMinutes % (24 * 60);
    const hh = String(Math.floor(displayMinutes / 60)).padStart(2, '0');
    const mm = String(displayMinutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }, [restauranteDetalle?.horario, watchFecha]);
  const restauranteStepWarning = !watchRestauranteId
    ? 'Selecciona un restaurante'
    : !hasSala
      ? 'Selecciona un espacio'
      : customSalaEnabled && !customSalaComplete
        ? 'Completa los datos del espacio'
        : null;
  const packStepWarning = (() => {
    if (!watchPackId) return 'Selecciona un plan';
    if (isAdhocPack) {
      return adhocItems.length > 0 ? null : 'Añade al menos un item';
    }
    if (isSinCompraPack) {
      if (!isAnticipoPack) return null;
      if (!watchAnticipoDescripcion || watchAnticipoPrecio == null || watchAnticipoPrecio < 2) {
        return 'Completa el anticipo';
      }
      return null;
    }
    if (!selectedPack) return 'Selecciona un plan';
    if (selectedPack.Categoria === 'Tickets') {
      return selectedTicketsCount > 0 ? null : 'Selecciona al menos un ticket';
    }
    if (!selectedElement) return 'Selecciona un elemento';
    if (selectedPack.Subcategoria === 'Barra Libre' && (!selectedInterval || !hasBarraLibreTiempo)) {
      return 'Selecciona intervalo y tiempo';
    }
    return null;
  })();
  const isPackStepComplete = useMemo(() => {
    if (!watchPackId) return false;
    if (isAdhocPack) return adhocItems.length > 0;
    if (isSinCompraPack) {
      if (!isAnticipoPack) return true;
      return Boolean(watchAnticipoDescripcion && watchAnticipoPrecio != null && watchAnticipoPrecio >= 2);
    }
    if (!selectedPack) return false;
    if (selectedPack.Categoria === 'Tickets') return selectedTicketsCount > 0;
    if (!selectedElement) return false;
    if (selectedPack.Subcategoria === 'Barra Libre') {
      return Boolean(selectedInterval) && hasBarraLibreTiempo;
    }
    return true;
  }, [
    watchPackId,
    isAdhocPack,
    adhocItems.length,
    isAnticipoPack,
    watchAnticipoDescripcion,
    watchAnticipoPrecio,
    selectedPack,
    selectedTicketsCount,
    selectedElement,
    selectedInterval,
    hasBarraLibreTiempo,
  ]);

  const questionsInvalid = useMemo(() => {
    if (questions.length === 0) return false;
    return questions.some((item) => {
      if (!item.question.trim()) return true;
      if (item.question_type === 'choice') {
        return (item.options ?? []).length < 2;
      }
      return false;
    });
  }, [questions]);

  const questionsStepWarning = questionsInvalid ? 'Completa las preguntas' : null;
  const isQuestionsStepComplete = !questionsInvalid;
  const clienteHasNombre = Boolean(watchNombreUsuario.trim());
  const clienteHasEmail = Boolean(normalizedEmail);
  const isClienteStepComplete = clienteHasNombre;
  const clienteStepWarning = clienteHasNombre ? null : 'Nombre requerido';
  const clienteStepLabel = clienteHasNombre && !clienteHasEmail ? 'Paso listo (sin email)' : 'Paso listo';

  const handleEnableSinCompraSala = async () => {
    if (!watchRestauranteId || !selectedSala) return;
    setSavingSinCompraSala(true);
    try {
      const nextSalas = (salas ?? []).map((sala) => {
        const normalized = {
          ...sala,
          aforoMinimo: Number(sala.aforoMinimo ?? 0),
          aforoMaximo: Number(sala.aforoMaximo ?? 0),
          precioPrivatizacion: Number(sala.precioPrivatizacion ?? 0),
          caracteristicas: sala.caracteristicas ?? {},
        };
        return sala.nombre === selectedSala.nombre
          ? { ...normalized, permiteReservaSinCompraAnticipada: true }
          : normalized;
      });
      await RestauranteDetalleService.updateSalas(watchRestauranteId, { salas: nextSalas });
      setSalas(nextSalas);
      setRestauranteDetalle((prev) => (prev ? { ...prev, salas: nextSalas } : prev));
    } finally {
      setSavingSinCompraSala(false);
      setConfirmSinCompraOpen(false);
    }
  };

  const validPacks = useMemo(() => {
    if (!watchRestauranteId) return [] as PackCatalogItem[];
    return packs.filter((pack) => {
      if (pack.Categoria === 'Menú' || pack.Categoria === 'Tickets' || pack.Categoria === 'Cocktail') {
        return filterElementsByRestaurant(pack, watchRestauranteId).length > 0;
      }
      if (pack.Categoria === 'Best Deal' && pack.Subcategoria === 'Barra Libre') {
        return filterElementsByRestaurant(pack, watchRestauranteId).length > 0;
      }
      return false;
    });
  }, [packs, watchRestauranteId]);
  const missingPlanCategories = useMemo(() => {
    if (!watchRestauranteId) return [] as string[];
    const hasMenus = packs.some((pack) => pack.Categoria === 'Menú' && filterElementsByRestaurant(pack, watchRestauranteId).length > 0);
    const hasTickets = packs.some((pack) => pack.Categoria === 'Tickets' && filterElementsByRestaurant(pack, watchRestauranteId).length > 0);
    const hasBarras = packs.some(
      (pack) => pack.Categoria === 'Best Deal' && pack.Subcategoria === 'Barra Libre' && filterElementsByRestaurant(pack, watchRestauranteId).length > 0
    );
    const missing: string[] = [];
    if (!hasMenus) missing.push('menús');
    if (!hasBarras) missing.push('barras libres');
    if (!hasTickets) missing.push('tickets');
    return missing;
  }, [packs, watchRestauranteId]);

  const adhocPlanTickets = useMemo(() => {
    return validPacks
      .filter((pack) => pack.Categoria === 'Tickets')
      .flatMap((pack) => {
        const tickets = (pack.Tickets ?? []) as Array<Record<string, unknown>>;
        return tickets.map((ticket, index) => {
          const name = String(ticket.Nombre ?? ticket.nombre ?? `Ticket ${index + 1}`);
          const price = Number(ticket.Precio ?? ticket.precio ?? 0);
          return {
            id: `${pack.id}::${index}`,
            name,
            price,
            packName: pack['Nombre del pack'] ?? '',
          };
        });
      });
  }, [validPacks]);

  const adhocBarra = useMemo(() => {
    return (restauranteDetalle?.consumicionesBarra ?? []) as ConsumicionBarraForm[];
  }, [restauranteDetalle]);

  const adhocRaciones = useMemo(() => {
    const base = (restauranteDetalle?.raciones ?? restauranteDetalle?.Raciones ?? []) as RacionForm[];
    return base;
  }, [restauranteDetalle]);

  const adhocTotal = useMemo(() => {
    return adhocItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [adhocItems]);
  const adhocTotalUsuarioFinal = useMemo(() => {
    return adhocTotal * 1.03 + 0.50;
  }, [adhocTotal]);

  const addAdhocItem = (item: Omit<AdhocItem, 'id'>) => {
    setAdhocItems((prev) => {
      const existingIndex = prev.findIndex(
        (entry) =>
          entry.source === item.source &&
          entry.name === item.name &&
          entry.price === item.price &&
          entry.tipo === item.tipo
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + item.quantity,
        };
        return next;
      }
      return [...prev, { ...item, id: `${item.source}-${item.name}-${Date.now()}` }];
    });
  };

  const canCreate = useMemo(() => {
    if (!watchRestauranteId || (!watchSalaId && !customSalaEnabled) || !watchPackId) return false;
    if (customSalaEnabled && !customSalaComplete) return false;
    if (!watchNombreUsuario) return false;
    if (!watchFechaLimite) return false;
    if (isAdhocPack && adhocItems.length === 0) return false;
    if (!isSinCompraPack) {
      if (selectedPack?.Categoria === 'Tickets') {
        if (!selectedTickets.length) return false;
      } else if (
        selectedPack &&
        (selectedPack.Categoria === 'Menú' ||
          selectedPack.Categoria === 'Cocktail' ||
          selectedPack.Subcategoria === 'Barra Libre')
      ) {
        if (!selectedElement) return false;
        if (selectedPack.Subcategoria === 'Barra Libre' && !selectedInterval) return false;
      }
    }
    if (isSinCompraPack && isAnticipoPack) {
      if (!watchAnticipoDescripcion || watchAnticipoPrecio == null) return false;
      if (Number(watchAnticipoPrecio) < 2) return false;
    }
    if (questionsInvalid) return false;
    return true;
  }, [
    watchRestauranteId,
    watchSalaId,
    customSalaEnabled,
    customSalaNombre,
    customSalaAforoMin,
    customSalaAforoMax,
    watchPackId,
    watchNombreUsuario,
    watchFechaLimite,
    watchAnticipoDescripcion,
    watchAnticipoPrecio,
    selectedPack,
    selectedElement,
    selectedInterval,
    isSinCompraPack,
    isAnticipoPack,
    isAdhocPack,
    adhocItems.length,
    questionsInvalid,
  ]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!restauranteDetalle || !selectedSala) return;
    const normalizedPackId = values.packId === 'anticipo_por_persona' ? 'sin_compra_anticipada' : values.packId;
    if (normalizedPackId !== 'sin_compra_anticipada' && normalizedPackId !== 'adhoc' && !selectedPack) return;
    if (normalizedPackId !== 'sin_compra_anticipada' && normalizedPackId !== 'adhoc') {
      const needsElement =
        selectedPack?.Categoria === 'Menú' ||
        selectedPack?.Categoria === 'Cocktail' ||
        selectedPack?.Subcategoria === 'Barra Libre';
      if (selectedPack?.Categoria === 'Tickets') {
        if (!selectedTickets.length) return;
      } else {
        if (needsElement && !selectedElement) return;
        if (selectedPack?.Subcategoria === 'Barra Libre' && !selectedInterval) return;
      }
    }
    const shouldRequireAnticipo = values.packId === 'anticipo_por_persona';
    if (normalizedPackId === 'sin_compra_anticipada' && shouldRequireAnticipo) {
      if (!values.anticipoDescripcion || values.anticipoPrecio == null || values.anticipoPrecio < 2) return;
    }
    if (normalizedPackId === 'adhoc' && adhocItems.length === 0) return;

    try {
      setSaving(true);
      const partner = await AuthService.getCurrentPartner();
      if (!partner) {
        setError('No se pudo cargar el partner');
        return;
      }
      setPartnerId(partner.id);
      const cleanedQuestions = questions
        .filter((item) => item.question.trim())
        .filter((item) => (item.question_type === 'choice' ? (item.options ?? []).length >= 2 : true))
        .map(({ question, question_type, required, options }) => {
          const base = {
            question: question.trim(),
            question_type,
            required,
          } as {
            question: string;
            question_type: QuestionType;
            required: boolean;
            options?: string[];
          };

          if (question_type === 'choice') {
            const cleanedOptions = (options ?? [])
              .map((opt) => opt.trim())
              .filter((opt) => opt.length > 0);
            if (cleanedOptions.length) {
              base.options = cleanedOptions;
            }
          }

          return base;
        });

      const selectedResponsable =
        responsables.find((item) => item.id === values.responsableId) ?? null;

      const reservaId = await ReservaCreateService.create({
        partnerId: partner.id,
        restaurante: { ...restauranteDetalle, id: watchRestauranteId },
        sala: selectedSala,
        pack:
          normalizedPackId === 'sin_compra_anticipada'
            ? ({
                id: 'sin_compra_anticipada',
                Categoria: 'Flexible',
                'Nombre del pack': 'Consumo libre en el local',
                tipo: 'sin_compra_anticipada',
                Descripción: '',
              } as PackCatalogItem)
            : normalizedPackId === 'adhoc'
              ? ({
                  id: 'adhoc',
                  Categoria: 'adhoc',
                  'Nombre del pack': 'Presupuesto personalizado',
                  tipo: 'adhoc',
                  Descripción: '',
                } as PackCatalogItem)
              : selectedPack,
        packId: normalizedPackId,
        selectedElement,
        selectedInterval,
        selectedTickets,
        adhocItems,
        fecha: values.fecha,
        horaInicio: values.horaInicio,
        horaFin: values.horaFin,
        fechaLimite: values.fechaLimite,
        aforoMin: values.aforoMin,
        aforoMax: values.aforoMax,
        nombreUsuario: values.nombreUsuario,
        email: values.email,
        anticipoActivo: shouldRequireAnticipo ? true : values.anticipoActivo ?? false,
        anticipoDescripcion: values.anticipoDescripcion,
        anticipoPrecio: values.anticipoPrecio,
        questions: cleanedQuestions.length ? cleanedQuestions : undefined,
        responsableEquipo: selectedResponsable
          ? {
              id: selectedResponsable.id,
              nombre: selectedResponsable.nombre,
              email: selectedResponsable.email,
              role: selectedResponsable.role,
            }
          : null,
        canal: values.canal || '',
      });
      setCreatedReservaId(reservaId);
      setShowCreatedModal(true);
    } finally {
      setSaving(false);
    }
  });

  const handleElementoSave = (element: Record<string, unknown>, interval: Record<string, unknown> | null) => {
    setSelectedElement(element);
    setSelectedInterval(interval);
  };

  const handleCreatedElement = (element: Record<string, unknown>) => {
    setElements((prev) => [...prev, element]);
    setSelectedElement(element);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-white text-[15px] leading-tight">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
          <div>
            <p className="text-[15px] uppercase tracking-[0.2em] text-slate-400">Reservas</p>
            <h1 className="text-[14px] font-semibold text-slate-900">Añadir reserva</h1>
            <p className="mt-1 text-[15px] text-slate-500">
              Configura una nueva reserva seleccionando restaurante, espacio y plan.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard/reservas')}>
            <ChevronLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 text-[14px]">
        <Dialog
          open={showCreatedModal}
          onOpenChange={(open) => {
            setShowCreatedModal(open);
            if (!open) {
              router.push('/dashboard/reservas');
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Reserva creada</DialogTitle>
              <DialogDescription>
                {isConsumoLibreSinAnticipo
                  ? watchEmail
                    ? 'Hemos enviado el enlace al cliente para confirmar la reserva.'
                    : 'No has añadido el email del cliente.'
                  : watchEmail
                    ? 'Hemos enviado un email al cliente para que gestione la reserva.'
                    : 'No has añadido el email del cliente.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-[15px] text-slate-600">
              {isConsumoLibreSinAnticipo ? (
                watchEmail ? (
                  <p>
                    Al ser una reserva de consumo libre, el cliente debe confirmarla desde el enlace. Ya se lo hemos enviado por correo.
                  </p>
                ) : (
                  <p>
                    Al ser una reserva de consumo libre, el cliente debe confirmarla desde el enlace. Compártelo con el cliente.
                  </p>
                )
              ) : watchEmail ? (
                <p>
                  También puedes compartir el enlace manualmente si lo necesitas.
                </p>
              ) : (
                <p>
                  Aquí tienes el enlace para compartir. Recuerda solicitar siempre el email para mejorar la conversión en reservas.
                </p>
              )}
              {createdReservaId && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-700">
                  {isConsumoLibreSinAnticipo
                    ? `${WEB_URL}/plan/${createdReservaId}/gestionar`
                    : `${WEB_URL}/pres/${createdReservaId}`}
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  if (!createdReservaId) return;
                  const url = isConsumoLibreSinAnticipo
                    ? `${WEB_URL}/plan/${createdReservaId}/gestionar`
                    : `${WEB_URL}/pres/${createdReservaId}`;
                  await navigator.clipboard.writeText(url);
                  setShowCreatedModal(false);
                  router.push('/dashboard/reservas');
                }}
              >
                Copiar enlace
              </Button>
              <Button
                className="bg-[#7472fd] text-white"
                onClick={() => {
                  setShowCreatedModal(false);
                  router.push('/dashboard/reservas');
                }}
              >
                Ir a reservas
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {isLoading && (
          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-[14px]">Cargando datos...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-2 w-48 animate-pulse rounded-full bg-slate-200" />
            </CardContent>
          </Card>
        )}
        {error && (
          <Card className="border-rose-200 bg-rose-50">
            <CardHeader>
              <CardTitle className="text-[14px] text-rose-600">{error}</CardTitle>
            </CardHeader>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-[15px]">
          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <div className="mb-3 flex w-full justify-center">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      watchRestauranteId ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                  <span
                    className="h-0.5 w-10 rounded-full"
                    style={{
                      background: watchRestauranteId
                        ? hasSala
                          ? '#22c55e'
                          : 'linear-gradient(to right, #22c55e 50%, #e2e8f0 50%)'
                        : '#e2e8f0',
                    }}
                  />
                  <span
                    className={`h-2 w-2 rounded-full ${hasSala ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  />
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-slate-400">
                    <MapPin className="h-4 w-4" />
                    Restaurante
                  </div>
                  <CardTitle className="text-[14px]">Restaurante y espacio</CardTitle>
                  <CardDescription>Selecciona el restaurante y el espacio para la reserva.</CardDescription>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 text-[12px] font-medium">
                  {isRestauranteStepComplete ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Paso listo</span>
                    </div>
                  ) : restauranteStepWarning ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{restauranteStepWarning}</span>
                    </div>
                  ) : (
                    <span className="text-transparent">.</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RestauranteSalaSection
                restaurantes={restaurantes}
                salas={salas}
                restauranteId={watchRestauranteId}
                salaId={watchSalaId}
                disableSalaSelect={customSalaEnabled}
                onRestauranteChange={(value) => {
                  form.setValue('restauranteId', value);
                  form.setValue('salaId', '');
                  form.setValue('packId', '');
                  form.setValue('aforoMin', 1);
                  form.setValue('aforoMax', 1);
                  setSelectedPack(null);
                  setSelectedElement(null);
                  setSelectedInterval(null);
                  setElements([]);
                  setSelectedTickets([]);
                  setAllowSinCompraOverride(false);
                  setCustomSalaEnabled(false);
                }}
                onSalaChange={(value) => {
                  setCustomSalaEnabled(false);
                  form.setValue('salaId', value);
                }}
              />
              <div className="mt-3">
                <button
                  type="button"
                  className="text-[12px] font-semibold text-[#3b3af2] underline underline-offset-2"
                  onClick={() => {
                    setCustomSalaEnabled((prev) => !prev);
                    if (!customSalaEnabled) {
                      form.setValue('salaId', '');
                    }
                  }}
                >
                  {customSalaEnabled ? 'Usar espacio del restaurante' : '¿Quieres poner un espacio personalizado?'}
                </button>
              </div>
              {customSalaEnabled && (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-3">
                    <label className="text-[12px] font-medium text-slate-700">Nombre del espacio</label>
                    <Input
                      value={customSalaNombre}
                      onChange={(event) => setCustomSalaNombre(event.target.value)}
                      placeholder="Espacio personalizado"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-slate-700">Aforo mínimo</label>
                    <NumberInput
                      value={typeof customSalaAforoMin === 'number' ? customSalaAforoMin : null}
                      onChangeValue={(value) => setCustomSalaAforoMin(value)}
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-slate-700">Aforo máximo</label>
                    <NumberInput
                      value={typeof customSalaAforoMax === 'number' ? customSalaAforoMax : null}
                      onChangeValue={(value) => setCustomSalaAforoMax(value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <div className="mb-3 flex w-full justify-center">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${watchPackId ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  <span
                    className="h-0.5 w-10 rounded-full"
                    style={{
                      background: watchPackId
                        ? isPackStepComplete
                          ? '#22c55e'
                          : 'linear-gradient(to right, #22c55e 50%, #e2e8f0 50%)'
                        : '#e2e8f0',
                    }}
                  />
                  <span className={`h-2 w-2 rounded-full ${isPackStepComplete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    <CalendarClock className="h-4 w-4" />
                    Plan
                  </div>
                  <CardTitle className="text-[14px]">Plan y elemento</CardTitle>
                  <CardDescription>Selecciona el plan y el elemento si aplica.</CardDescription>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 text-[10px] font-medium">
                  {isPackStepComplete ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Paso listo</span>
                    </div>
                  ) : packStepWarning ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{packStepWarning}</span>
                    </div>
                  ) : (
                    <span className="text-transparent">.</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-slate-700">Plan</label>
                <div className="relative">
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px]"
                    value={watchPackId}
                    onChange={(event) => form.setValue('packId', event.target.value)}
                    disabled={!hasSala}
                  >
                    <option value="">Selecciona un plan</option>
                    <option value="adhoc">Presupuesto personalizado</option>
                    {validPacks.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack['Nombre del pack']} · {getPackLabel(pack)}
                      </option>
                    ))}
                  {canUseSinCompra && (
                    <>
                      <option value="sin_compra_anticipada">Consumo libre en el local</option>
                      <option value="anticipo_por_persona">Anticipo por persona</option>
                    </>
                  )}
                  </select>
                  {!hasSala && (
                    <button
                      type="button"
                      className="absolute inset-0 cursor-not-allowed"
                      aria-label="Selecciona un restaurante y un espacio"
                      onClick={handlePlanHint}
                    />
                  )}
                  {showPlanHint && !hasSala && (
                    <div className="absolute -top-8 left-0 z-10 rounded-full bg-slate-900 px-3 py-1 text-[11px] text-white shadow">
                      Selecciona un restaurante y un espacio
                    </div>
                  )}
                </div>
                {isAdhocPack && (
                  <p className="mt-2 text-[12px] text-slate-500">
                    Este plan permite solo pago completo. No admite división del pago entre invitados.
                  </p>
                )}
                {!hasSala && (
                  <p className="mt-2 text-[12px] text-slate-500">
                    Debes seleccionar un espacio para poder elegir un plan.
                  </p>
                )}
                {!allowSinCompra && watchSalaId && !allowSinCompraOverride && (
                  <div className="mt-2 space-y-2 text-[12px] text-slate-500">
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
                  <div className="mt-2 space-y-1 text-[12px] text-emerald-600">
                    <p className="font-medium">Habilitado consumo libre en el local y anticipo por persona para esta reserva.</p>
                    {watchPackId === 'sin_compra_anticipada' && (
                      <button
                        type="button"
                        className="font-medium text-[#3b3af2] underline underline-offset-2"
                        onClick={() => form.setValue('packId', 'anticipo_por_persona')}
                      >
                        ¿Quieres solicitar un anticipo por persona?
                      </button>
                    )}
                    {watchPackId === 'anticipo_por_persona' && (
                      <button
                        type="button"
                        className="font-medium text-[#3b3af2] underline underline-offset-2"
                        onClick={() => form.setValue('packId', 'sin_compra_anticipada')}
                      >
                        ¿Quieres que la reserva sea de consumo libre en el local?
                      </button>
                    )}
                  </div>
                )}
                {watchRestauranteId && validPacks.length === 0 && (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500">
                    Este restaurante no tiene{' '}
                    {missingPlanCategories.length
                      ? missingPlanCategories.join(' / ')
                      : 'menús / barras libres / tickets'}{' '}
                    configurados. Añade elementos en la información del plan.
                  </div>
                )}
              </div>

              {isAdhocPack && (
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[12px] font-semibold text-slate-900">Tickets de consumiciones</p>
                      <div className="mt-2 grid gap-2">
                        <select
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px]"
                          value={adhocPlanTicketId}
                          onChange={(event) => setAdhocPlanTicketId(event.target.value)}
                          disabled={!adhocPlanTickets.length}
                        >
                          <option value="">
                            {adhocPlanTickets.length ? 'Selecciona un ticket' : 'Sin tickets disponibles'}
                          </option>
                          {adhocPlanTickets.map((ticket) => (
                            <option key={ticket.id} value={ticket.id}>
                              {ticket.name} · {ticket.price.toFixed(2)}€ {ticket.packName ? `(${ticket.packName})` : ''}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <NumberInput
                            min={1}
                            value={adhocPlanTicketQty}
                            onChangeValue={(value) => setAdhocPlanTicketQty(value)}
                            className="h-9 text-[12px]"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 px-3 text-[12px]"
                            onClick={() => {
                              const selected = adhocPlanTickets.find((item) => item.id === adhocPlanTicketId);
                              if (!selected) return;
                              addAdhocItem({
                                source: 'plan_ticket',
                                tipo: 'bebida',
                                name: selected.name,
                                price: selected.price,
                                quantity: adhocPlanTicketQty,
                              });
                              setAdhocPlanTicketId('');
                              setAdhocPlanTicketQty(1);
                            }}
                            disabled={!adhocPlanTicketId}
                          >
                            Añadir
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[12px] font-semibold text-slate-900">Consumiciones en barra</p>
                      <div className="mt-2 grid gap-2">
                        <select
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px]"
                          value={adhocBarraId}
                          onChange={(event) => setAdhocBarraId(event.target.value)}
                          disabled={!adhocBarra.length}
                        >
                          <option value="">
                            {adhocBarra.length ? 'Selecciona una consumición' : 'Sin consumiciones en barra'}
                          </option>
                          {adhocBarra.map((item, index) => (
                            <option key={`${item.nombre}-${index}`} value={String(index)}>
                              {item.nombre} · {Number(item.precio ?? 0).toFixed(2)}€
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <NumberInput
                            min={1}
                            value={adhocBarraQty}
                            onChangeValue={(value) => setAdhocBarraQty(value)}
                            className="h-9 text-[12px]"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 px-3 text-[12px]"
                            onClick={() => {
                              const index = Number(adhocBarraId);
                              const selected = Number.isNaN(index) ? null : adhocBarra[index];
                              if (!selected) return;
                              addAdhocItem({
                                source: 'barra',
                                tipo: 'bebida',
                                name: selected.nombre,
                                price: Number(selected.precio ?? 0),
                                quantity: adhocBarraQty,
                              });
                              setAdhocBarraId('');
                              setAdhocBarraQty(1);
                            }}
                            disabled={!adhocBarraId}
                          >
                            Añadir
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[12px] font-semibold text-slate-900">Raciones</p>
                      <div className="mt-2 grid gap-2">
                        <select
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px]"
                          value={adhocRacionId}
                          onChange={(event) => setAdhocRacionId(event.target.value)}
                          disabled={!adhocRaciones.length}
                        >
                          <option value="">
                            {adhocRaciones.length ? 'Selecciona una ración' : 'Sin raciones'}
                          </option>
                          {adhocRaciones.map((item, index) => (
                            <option key={`${item.nombre}-${index}`} value={String(index)}>
                              {item.nombre} · {Number(item.precio ?? 0).toFixed(2)}€
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <NumberInput
                            min={1}
                            value={adhocRacionQty}
                            onChangeValue={(value) => setAdhocRacionQty(value)}
                            className="h-9 text-[12px]"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 px-3 text-[12px]"
                            onClick={() => {
                              const index = Number(adhocRacionId);
                              const selected = Number.isNaN(index) ? null : adhocRaciones[index];
                              if (!selected) return;
                              addAdhocItem({
                                source: 'racion',
                                tipo: 'comida',
                                name: selected.nombre,
                                price: Number(selected.precio ?? 0),
                                quantity: adhocRacionQty,
                              });
                              setAdhocRacionId('');
                              setAdhocRacionQty(1);
                            }}
                            disabled={!adhocRacionId}
                          >
                            Añadir
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                      <p className="text-[12px] font-semibold text-slate-900">Añadir manual</p>
                      <div className="mt-2 grid gap-2">
                        <Input
                          value={adhocManualNombre}
                          onChange={(event) => setAdhocManualNombre(event.target.value)}
                          placeholder="Nombre"
                          className="h-9 text-[12px]"
                        />
                        <div className="grid gap-2 md:grid-cols-3">
                          <select
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px]"
                            value={adhocManualTipo}
                            onChange={(event) => setAdhocManualTipo(event.target.value as AdhocTipo)}
                          >
                            <option value="comida">Comida</option>
                            <option value="bebida">Bebida</option>
                          </select>
                          <NumberInput
                            min={1}
                            value={adhocManualQty}
                            onChangeValue={(value) => setAdhocManualQty(value)}
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
                          className="h-9 px-3 text-[12px]"
                          onClick={() => {
                            if (!adhocManualNombre || adhocManualPrecio === '') return;
                            addAdhocItem({
                              source: 'manual',
                              tipo: adhocManualTipo,
                              name: adhocManualNombre,
                              price: Number(adhocManualPrecio),
                              quantity: adhocManualQty,
                            });
                            setAdhocManualNombre('');
                            setAdhocManualQty(1);
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

                  <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
                      {adhocItems.length === 0 ? (
                        <p className="text-[12px] text-slate-500">Aún no has añadido items.</p>
                      ) : (
                        adhocItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">{item.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {item.tipo === 'bebida' ? 'Bebida' : 'Comida'} · {item.price.toFixed(2)}€ unidad
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1">
                                <button
                                  type="button"
                                  className="text-[12px] text-slate-500 hover:text-slate-900"
                                  onClick={() =>
                                    setAdhocItems((prev) =>
                                      prev
                                        .map((entry) =>
                                          entry.id === item.id
                                            ? { ...entry, quantity: Math.max(0, entry.quantity - 1) }
                                            : entry
                                        )
                                        .filter((entry) => entry.quantity > 0)
                                    )
                                  }
                                >
                                  −
                                </button>
                                <span className="min-w-[20px] text-center text-[12px] font-semibold text-slate-900">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="text-[12px] text-slate-500 hover:text-slate-900"
                                  onClick={() =>
                                    setAdhocItems((prev) =>
                                      prev.map((entry) =>
                                        entry.id === item.id
                                          ? { ...entry, quantity: entry.quantity + 1 }
                                          : entry
                                      )
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
                              <span className="font-semibold text-slate-900">
                                {(item.quantity * item.price).toFixed(2)}€
                              </span>
                              <button
                                type="button"
                                className="text-rose-600 hover:text-rose-700"
                                onClick={() =>
                                  setAdhocItems((prev) => prev.filter((entry) => entry.id !== item.id))
                                }
                                aria-label="Quitar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex items-center justify-between text-[12px] text-slate-600">
                        <span>Total</span>
                        <span className="font-semibold text-slate-900">{adhocTotal.toFixed(2)}€</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[12px] text-slate-600">
                        <span>Total con comisión</span>
                        <span className="font-semibold text-slate-900">
                          {adhocTotalUsuarioFinal.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isAdhocPack && selectedPack && selectedPack.Categoria !== 'Tickets' && (
                <div>
                  <label className="text-[12px] font-medium text-slate-700">{getElementLabel(selectedPack)}</label>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {getElementDescription(selectedPack)}
                  </p>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px]"
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
                  {selectedPack?.id && watchRestauranteId && (
                    <div className="mt-3">
                      <CrearElementoModal
                        packId={selectedPack.id}
                        packKind={
                          selectedPack.Categoria === 'Best Deal'
                            ? 'Barra Libre'
                            : (selectedPack.Categoria as 'Menú' | 'Cocktail')
                        }
                        restauranteId={watchRestauranteId}
                        onCreated={handleCreatedElement}
                      />
                    </div>
                  )}
                </div>
              )}

              {!isAdhocPack && selectedPack?.Categoria === 'Tickets' && (
                <div className="space-y-3">
                  <p className="text-[12px] font-medium text-slate-700">Tickets incluidos</p>
                  <p className="text-[12px] text-slate-500">
                    Elige los tickets que quieres ofrecer en esta reserva o crea uno desde cero. Puedes ajustar el precio
                    y la cantidad que verá el cliente.
                  </p>
                  <TicketsEditor tickets={selectedTickets} onChange={setSelectedTickets} />
                  {selectedPack?.id && watchRestauranteId && (
                    <CrearElementoModal
                      packId={selectedPack.id}
                      packKind="Tickets"
                      restauranteId={watchRestauranteId}
                      onCreated={(element) => {
                        setSelectedTickets((prev) => [...prev, { ...element, quantity: watchAforoMax ?? 1 }]);
                      }}
                    />
                  )}
                </div>
              )}

              {selectedElement ? (
                <ElementoEditor
                  pack={selectedPack}
                  selectedElement={selectedElement}
                  selectedInterval={selectedInterval}
                  restauranteId={watchRestauranteId}
                  onSave={handleElementoSave}
                />
              ) : null}

              {selectedPack?.Subcategoria === 'Barra Libre' && selectedElement && (
                <BarraLibreIntervalo
                  intervalos={getIntervalsForRestaurante(selectedElement, watchRestauranteId)}
                  selected={selectedInterval}
                  onSelect={setSelectedInterval}
                />
              )}


              {isSinCompraPack && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">
                        {isAnticipoPack ? 'Anticipo por persona' : 'Consumo libre en el local'}
                      </p>
                      <p className="text-[12px] text-slate-500">
                        {isAnticipoPack
                          ? 'Añade el anticipo obligatorio por persona para esta reserva.'
                          : 'Reserva sin anticipo, con consumo libre en el local.'}
                      </p>
                    </div>
                  </div>
                  {isAnticipoPack && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-[12px] font-medium text-slate-700">Descripción del anticipo</label>
                        <Textarea
                          value={watchAnticipoDescripcion}
                          onChange={(event) => form.setValue('anticipoDescripcion', event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-medium text-slate-700">Precio (€)</label>
                        <NumberInput
                          value={watchAnticipoPrecio}
                          onChangeValue={(value) => form.setValue('anticipoPrecio', value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={confirmSinCompraOpen} onOpenChange={setConfirmSinCompraOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
              <DialogTitle>Habilitar consumo libre en el local</DialogTitle>
              <DialogDescription>
                Si lo activas en el espacio, todos los clientes podrán solicitar consumo libre en este espacio desde el marketplace.
              </DialogDescription>
              </DialogHeader>
              <div className="mt-4 text-[10px] text-slate-500">
                ¿Solo quieres habilitarlo en esta reserva?{' '}
                <button
                  type="button"
                  className="font-medium text-[#3b3af2] underline underline-offset-2"
                  onClick={() => {
                    setAllowSinCompraOverride(true);
                    form.setValue('packId', 'sin_compra_anticipada');
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
                <Button
                  className="bg-[#7472fd] text-white"
                  onClick={handleEnableSinCompraSala}
                  disabled={savingSinCompraSala}
                >
                  {savingSinCompraSala ? 'Guardando...' : 'Habilitar en el espacio'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Card className="border-none bg-white shadow-sm">
            <FechaSection
              fecha={watchFecha}
              fechaLimite={watchFechaLimite}
              horaInicio={watchHoraInicio}
              horaFin={watchHoraFin}
              closingTime={horarioClosingTime}
              onUseClosingTime={
                horarioClosingTime
                  ? () => form.setValue('horaFin', horarioClosingTime)
                  : undefined
              }
              aforoMin={watchAforoMin}
              aforoMax={watchAforoMax}
              steps={[
                Boolean(watchFecha),
                Boolean(watchFechaLimite),
                Boolean(watchHoraInicio),
                Boolean(watchHoraFin),
                Number(watchAforoMin ?? 0) > 0,
                Number(watchAforoMax ?? 0) > 0,
              ]}
              isComplete={Boolean(
                watchFecha &&
                  watchFechaLimite &&
                  watchHoraInicio &&
                  watchHoraFin &&
                  Number(watchAforoMin ?? 0) > 0 &&
                  Number(watchAforoMax ?? 0) > 0
              )}
              warning={
                !watchFecha
                  ? 'Selecciona una fecha'
                  : !watchFechaLimite
                    ? 'Selecciona la fecha límite'
                    : !watchHoraInicio
                      ? 'Selecciona hora inicio'
                      : !watchHoraFin
                        ? 'Selecciona hora fin'
                        : Number(watchAforoMin ?? 0) <= 0
                          ? 'Introduce aforo mínimo'
                          : Number(watchAforoMax ?? 0) <= 0
                            ? 'Introduce aforo máximo'
                        : null
              }
              onChange={(field, value) => {
                if (typeof value === 'number') {
                  form.setValue(field as 'aforoMin' | 'aforoMax', Number(value));
                } else {
                  form.setValue(
                    field as 'fecha' | 'fechaLimite' | 'horaInicio' | 'horaFin',
                    String(value)
                  );
                }
              }}
            />
          </Card>

          {!isAdhocPack && (
          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    <Info className="h-4 w-4" />
                    Preguntas
                  </div>
                  <CardTitle className="text-[14px]">Preguntas para los invitados</CardTitle>
                  <CardDescription>
                    Estas preguntas se harán a todos los invitados del plan antes de marcar asistencia o comprar su parte del plan.
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 text-[10px] font-medium">
                  {isQuestionsStepComplete ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Paso listo</span>
                    </div>
                  ) : questionsStepWarning ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{questionsStepWarning}</span>
                    </div>
                  ) : (
                    <span className="text-transparent">.</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2">
                <label className="text-[12px] font-medium text-slate-700">Preguntas para los invitados</label>
                {questions.length === 0 && (
                  <Button type="button" variant="outline" onClick={addQuestion}>
                    Añadir pregunta
                  </Button>
                )}
              </div>

              {questions.length > 0 && (
                <div className="mt-4 space-y-3">
                  {questions.map((item, index) => (
                    <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-slate-600">Pregunta {index + 1}</p>
                        <button
                          type="button"
                          className="text-[10px] text-rose-600 hover:text-rose-700"
                          onClick={() => removeQuestion(item.id)}
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="text-[12px] font-medium text-slate-600">Pregunta</label>
                          <Input
                            value={item.question}
                            onChange={(event) => updateQuestion(item.id, { question: event.target.value })}
                            placeholder="Ej: ¿Qué quieres de primer plato?"
                          />
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-slate-600">Tipo de pregunta</label>
                          <select
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px]"
                            value={item.question_type}
                            onChange={(event) =>
                              updateQuestion(item.id, { question_type: event.target.value as QuestionType })
                            }
                          >
                            <option value="string">Texto libre</option>
                            <option value="choice">Opción múltiple</option>
                            <option value="boolean">Sí / No</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            id={`question-required-${item.id}`}
                            type="checkbox"
                            className="h-4 w-4 accent-[#7472fd]"
                            checked={item.required}
                            onChange={(event) => updateQuestion(item.id, { required: event.target.checked })}
                          />
                          <label htmlFor={`question-required-${item.id}`} className="text-[12px] font-medium text-slate-600">
                            Pregunta requerida
                          </label>
                        </div>
                      </div>

                      {item.question_type === 'choice' && (
                        <div className="mt-3 space-y-2">
                          <label className="text-[12px] font-medium text-slate-600">Opciones</label>
                          <div className="flex gap-2">
                            <Input
                              value={item.optionDraft ?? ''}
                              onChange={(event) => updateQuestion(item.id, { optionDraft: event.target.value })}
                              placeholder="Ej: Opción 1"
                            />
                            <Button type="button" variant="outline" onClick={() => addOption(item.id)}>
                              Añadir
                            </Button>
                          </div>
                          {item.options && item.options.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {item.options.map((opt, optIndex) => (
                                <button
                                  key={`${opt}-${optIndex}`}
                                  type="button"
                                  className="rounded-full border border-slate-200 px-3 py-1 text-[10px] text-slate-600 hover:border-rose-200 hover:text-rose-600"
                                  onClick={() => removeOption(item.id, optIndex)}
                                >
                                  {opt} · quitar
                                </button>
                              ))}
                            </div>
                          )}
                          {item.options && item.options.length > 0 && item.options.length < 2 && (
                            <p className="text-[10px] text-amber-600">Añade al menos 2 opciones.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={addQuestion}>
                      Añadir pregunta
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    <User className="h-4 w-4" />
                    Responsable
                  </div>
                  <CardTitle className="text-[14px]">Responsable y canal</CardTitle>
                  <CardDescription>
                    Asigna un responsable interno y define el canal de esta reserva.
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 text-[10px] font-medium">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Paso listo</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[12px] font-medium text-slate-700">Responsable</label>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Persona del equipo que gestionará esta reserva.
                  </p>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px]"
                    value={watchResponsableId}
                    onChange={(event) => form.setValue('responsableId', event.target.value)}
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
                  <label className="text-[12px] font-medium text-slate-700">Canal</label>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Indica por dónde llegó la reserva (origen del contacto).
                  </p>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px]"
                    value={watchCanal}
                    onChange={(event) => form.setValue('canal', event.target.value)}
                  >
                    <option value="">Sin canal</option>
                    {canales.map((canal) => (
                      <option key={canal} value={canal}>
                        {canal}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="mt-3 text-[11px] font-semibold text-[#3b3af2] underline underline-offset-4"
                    onClick={() => setCanalDialogOpen(true)}
                  >
                    ¿Quieres añadir un nuevo canal?
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <div className="mb-3 flex w-full justify-center">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${clienteHasNombre ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  <span
                    className="h-0.5 w-10 rounded-full"
                    style={{
                      background: clienteHasNombre
                        ? clienteHasEmail
                          ? '#22c55e'
                          : 'linear-gradient(to right, #22c55e 50%, #e2e8f0 50%)'
                        : '#e2e8f0',
                    }}
                  />
                  <span className={`h-2 w-2 rounded-full ${clienteHasEmail ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    <Mail className="h-4 w-4" />
                    Cliente
                  </div>
                  <CardTitle className="text-[14px]">Contacto</CardTitle>
                  <CardDescription>Datos de contacto para esta reserva.</CardDescription>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 text-[10px] font-medium">
                  {isClienteStepComplete ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{clienteStepLabel}</span>
                    </div>
                  ) : clienteStepWarning ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{clienteStepWarning}</span>
                    </div>
                  ) : (
                    <span className="text-transparent">.</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[12px] font-medium text-slate-700">Nombre del cliente</label>
                  <Input
                    type="text"
                    value={watchNombreUsuario}
                    onChange={(event) => form.setValue('nombreUsuario', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-slate-700">Email del cliente</label>
                  <Input
                    type="email"
                    value={watchEmail}
                    onChange={(event) => form.setValue('email', event.target.value)}
                    aria-invalid={emailInvalid}
                  />
                  {emailInvalid && (
                    <p className="mt-1 text-[11px] font-medium text-amber-600">Email inválido</p>
                  )}
                </div>
              </div>
              {!watchEmail && (
                <p className="mt-2 text-[12px] text-slate-500">
                  Si no añades email, tendrás que compartir manualmente el enlace de la reserva con el cliente al crearla.
                </p>
              )}
            </CardContent>
          </Card>

          <Dialog open={canalDialogOpen} onOpenChange={setCanalDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Añadir canal</DialogTitle>
                <DialogDescription>Guarda un nuevo canal para clasificar reservas.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <label className="text-[12px] font-medium text-slate-700">Nombre del canal</label>
                <Input
                  placeholder="Ej: Instagram, WhatsApp, Referidos"
                  value={canalDraft}
                  onChange={(event) => setCanalDraft(event.target.value)}
                />
                {canales.length > 0 && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Canales actuales
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canales.map((canal) => (
                        <span
                          key={canal}
                          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600"
                        >
                          {canal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCanalDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-[#7472fd] text-white"
                  onClick={handleAddCanal}
                  disabled={!normalizedCanalDraft || savingCanal}
                >
                  {savingCanal ? 'Guardando...' : 'Añadir canal'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <Info className="h-4 w-4" />
              Completa todos los campos para crear la reserva.
            </div>
            <Button type="submit" className="bg-[#7472fd] text-white" disabled={!canCreate || saving}>
              {saving ? 'Creando...' : 'Añadir reserva'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
