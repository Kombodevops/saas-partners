'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';
import { Timestamp } from 'firebase/firestore';
import { AuthService } from '@/lib/services/auth.service';
import { PackDetalleService, type PackDetalle } from '@/lib/services/pack-detalle.service';
import { PackEditService } from '@/lib/services/pack-edit.service';
import { RestauranteQuickLinks } from '@/app/restaurantes/components/detalle/quick-links';
import { InfoGeneralCard } from '@/app/restaurantes/components/detalle/info-general-card';
import { ImagenesCard } from '@/app/restaurantes/components/detalle/imagenes-card';
import { HorarioCard } from '@/app/restaurantes/components/detalle/horario-card';
import { CartaCard } from '@/app/restaurantes/components/detalle/carta-card';
import { ResponsableCard } from '@/app/restaurantes/components/detalle/responsable-card';
import { CaracteristicasCard } from '@/app/restaurantes/components/detalle/caracteristicas-card';
import { SalasCard } from '@/app/restaurantes/components/detalle/salas-card';
import { BarraCard } from '@/app/restaurantes/components/detalle/barra-card';
import { ExtrasCard } from '@/app/restaurantes/components/detalle/extras-card';
import { RacionesCard } from '@/app/restaurantes/components/detalle/raciones-card';
import { PacksCard } from '@/app/restaurantes/components/detalle/packs-card';
import { DatosFiscalesCard } from '@/app/restaurantes/components/detalle/datos-fiscales-card';
import { DIAS_SEMANA, type RestauranteHorarioForm } from '@/lib/validators/restaurante-horario';
import { useRestaurantes } from '@/components/shared/restaurantes-context';

interface RestauranteDetallePageProps {
  params: Promise<{ id: string }>;
}

const RESTAURANTE_COLORS = [
  '#334155',
  '#475569',
  '#2563eb',
  '#3b82f6',
  '#1d4ed8',
  '#0ea5e9',
  '#0284c7',
  '#14b8a6',
  '#0d9488',
  '#22c55e',
  '#16a34a',
  '#84cc16',
  '#eab308',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#e11d48',
  '#ec4899',
  '#a855f7',
  '#8b5cf6',
];

const formatTimestamp = (value: Timestamp) => {
  const date = value.toDate();
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export default function RestauranteDetallePage({ params }: RestauranteDetallePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<RestauranteDetalleDoc | null>(null);
  const [packs, setPacks] = useState<PackDetalle[]>([]);
  const [allPacks, setAllPacks] = useState<PackDetalle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abiertoDialogOpen, setAbiertoDialogOpen] = useState(false);
  const [isTogglingAbierto, setIsTogglingAbierto] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [horarioOpen, setHorarioOpen] = useState(false);
  const [cartaOpen, setCartaOpen] = useState(false);
  const [salasOpen, setSalasOpen] = useState(false);
  const [racionesOpen, setRacionesOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [barraOpen, setBarraOpen] = useState(false);
  const [responsableOpen, setResponsableOpen] = useState(false);
  const [caracteristicasOpen, setCaracteristicasOpen] = useState(false);
  const [imagenesOpen, setImagenesOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [creatingPack, setCreatingPack] = useState<null | 'menus' | 'tickets' | 'barras'>(null);
  const [fiscalSuccessOpen, setFiscalSuccessOpen] = useState(false);
  const [isSavingColor, setIsSavingColor] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const { refresh: refreshRestaurantes } = useRestaurantes();

  useEffect(() => {
    if (!data?.id) return;
    const key = `komvo_restaurante_intro_${data.id}`;
    const alreadySeen = sessionStorage.getItem(key);
    if (!alreadySeen) {
      sessionStorage.setItem(key, '1');
      setIntroOpen(true);
    }
  }, [data?.id]);

  const normalizedSalas = useMemo(
    () =>
      data?.salas?.map((sala) => ({
        ...sala,
        aforoMinimo: Number(sala.aforoMinimo ?? 0),
        aforoMaximo: Number(sala.aforoMaximo ?? 0),
        precioPrivatizacion: Number(sala.precioPrivatizacion ?? 0),
        caracteristicas: sala.caracteristicas ?? {},
      })),
    [data?.salas]
  );
  const normalizedConsumicionesBarra = useMemo(
    () =>
      data?.consumicionesBarra?.map((item) => ({
        ...item,
        precio: Number(item.precio ?? 0),
      })),
    [data?.consumicionesBarra]
  );
  const normalizedExtras = useMemo<
    | Array<{
        nombre: string;
        descripcion: string;
        precio: number;
        tipoPrecio: 'porHora' | 'porUnidad' | 'fijo';
        tiempoMinimoHoras?: number;
        tipoIncremento?: 'porHora' | 'porMediaHora';
        unidadesMinimas?: number;
      }>
    | undefined
  >(
    () =>
      data?.extras?.map((item) => ({
        ...item,
        precio: Number(item.precio ?? 0),
        tipoPrecio:
          item.tipoPrecio === 'porHora' || item.tipoPrecio === 'porUnidad' ? item.tipoPrecio : 'fijo',
        tipoIncremento:
          item.tipoIncremento === 'porMediaHora'
            ? 'porMediaHora'
            : item.tipoIncremento === 'porHora'
              ? 'porHora'
              : undefined,
        tiempoMinimoHoras: item.tiempoMinimoHoras != null ? Number(item.tiempoMinimoHoras) : undefined,
        unidadesMinimas: item.unidadesMinimas != null ? Number(item.unidadesMinimas) : undefined,
      })),
    [data?.extras]
  );
  const normalizedRaciones = useMemo<
    | Array<{
        nombre: string;
        descripcion: string;
        precio: number;
      }>
    | undefined
  >(
    () =>
      data?.raciones?.map((item) => ({
        ...item,
        precio: Number(item.precio ?? 0),
      })),
    [data?.raciones]
  );

  useEffect(() => {
    if (!searchParams) return;
    const shouldOpen = searchParams.get('fiscalAssigned') === '1';
    if (shouldOpen) {
      setFiscalSuccessOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await RestauranteDetalleService.getRestauranteById(id);
        if (!active) return;
        if (!result) {
          setError('No se encontro el restaurante');
          return;
        }
        setData(result);

        const partner = await AuthService.getCurrentPartner();
        if (!partner || !active) return;

        const [packsData, allPacksData] = await Promise.all([
          PackDetalleService.getPacksByRestaurante(partner.id, id),
          PackDetalleService.getPacksByOwner(partner.id),
        ]);
        if (!active) return;
        setPacks(packsData);
        setAllPacks(allPacksData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Error al cargar restaurante');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id]);

  const cartaItems = useMemo(() => {
    if (!data?.Carta) return [];
    return Object.entries(data.Carta).map(([key, value]) => ({ key, ...value }));
  }, [data?.Carta]);

  const horarioEntries = useMemo(() => Object.entries(data?.horario ?? {}), [data?.horario]);

  const raciones = useMemo(() => {
    if (!data) return [];
    return data.raciones ?? (data as RestauranteDetalleDoc & { Raciones?: typeof data.raciones })?.Raciones ?? [];
  }, [data]);

  const horarioForm = useMemo<RestauranteHorarioForm>(() => {
    const dias: RestauranteHorarioForm['dias'] = {} as RestauranteHorarioForm['dias'];
    DIAS_SEMANA.forEach((dia) => {
      const value = data?.horario?.[dia];
      dias[dia] = {
        cerrado: value?.cerrado ?? true,
        intervalos:
          value?.intervalos?.map((intervalo) => ({
            horaInicio: formatTimestamp(intervalo.horaInicio),
            horaFin: formatTimestamp(intervalo.horaFin),
          })) ?? [],
      };
    });
    return { dias };
  }, [data?.horario]);

  const presupuestoLabel = useMemo(() => {
    switch (data?.presupuesto) {
      case '1':
        return 'Low cost';
      case '2':
        return 'Precio medio';
      case '3':
        return 'Premium';
      default:
        return 'Sin definir';
    }
  }, [data?.presupuesto]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <div className="h-12 w-48 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-40 w-full animate-pulse rounded-2xl bg-white" />
          <div className="h-40 w-full animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <Card className="border-dashed border-rose-200 bg-rose-50">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <CardTitle className="text-base text-rose-600">{error ?? 'Error inesperado'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => router.push('/dashboard/restaurantes')}>
                Volver a restaurantes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stripeAccountId = data?.stripeAccountId;

  const handleToggleAbierto = async () => {
    if (!data || !stripeAccountId) return;
    try {
      setIsTogglingAbierto(true);
      const nextValue = !data.abierto;
      await RestauranteDetalleService.updateAbierto(id, nextValue);
      setData({ ...data, abierto: nextValue });
      await refreshRestaurantes({ force: true });
      setAbiertoDialogOpen(false);
    } finally {
      setIsTogglingAbierto(false);
    }
  };

  const handleSelectColor = async (color: string) => {
    if (!data) return;
    try {
      setIsSavingColor(true);
      await RestauranteDetalleService.updateColor(id, color);
      setData({ ...data, color });
      await refreshRestaurantes({ force: true });
    } finally {
      setIsSavingColor(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      {fiscalSuccessOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50" />
      )}
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <Card className="border-none bg-white shadow-sm ring-1 ring-slate-100">
          <CardContent className="relative grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="min-w-[240px]">
              <Button variant="outline" className="mb-4 gap-2" onClick={() => router.push('/dashboard/restaurantes')}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <p className="text-xs font-semibold text-[#7472fd]">
                Detalla todo lo que ofrece tu local para destacar en el marketplace.
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">{data['Nombre del restaurante']}</h1>
              <p className="mt-1 text-sm text-slate-500">{data['Descripción']}</p>
            </div>
            <div className="flex flex-col items-end gap-3 text-right lg:justify-start">
              <button
                type="button"
                onClick={() => setAbiertoDialogOpen(true)}
                disabled={!stripeAccountId}
                className={`relative z-50 flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold shadow-sm transition ${
                  data.abierto
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                } ${!stripeAccountId ? 'cursor-not-allowed opacity-60 hover:bg-rose-50' : ''}`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    data.abierto ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                {data.abierto ? 'Abierto' : 'Cerrado'}
                <span className="text-xs text-slate-500">Toca para cambiar</span>
              </button>
              {!stripeAccountId && (
                <p className="text-xs text-slate-500">
                  Completa los datos fiscales para poder abrir el restaurante.
                </p>
              )}
              {fiscalSuccessOpen && (
                <div className="pointer-events-auto absolute right-0 top-full z-50 mt-3 w-[280px] rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 shadow-lg">
                  <div className="absolute -top-2 right-8 h-4 w-4 rotate-45 border-l border-t border-emerald-200 bg-emerald-50" />
                  <p className="font-semibold">¡Enhorabuena!</p>
                  <p className="mt-1 text-emerald-900/80">
                    Ya puedes abrir el restaurante en el marketplace. Revisa siempre tus planes para saber qué estás
                    vendiendo.
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
                      onClick={() => {
                        setFiscalSuccessOpen(false);
                        router.replace(`/restaurantes/${id}`);
                      }}
                    >
                      Entendido
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 text-xs text-slate-500 lg:col-start-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setColorPickerOpen((prev) => !prev)}
                className="gap-2"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: data.color || '#94a3b8' }} />
                Asignar color a este restaurante
              </Button>
              {colorPickerOpen && (
                <div className="mt-1 flex flex-wrap justify-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  {RESTAURANTE_COLORS.map((color) => {
                    const isActive = data.color === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleSelectColor(color)}
                        disabled={isSavingColor}
                        className={`h-7 w-7 rounded-full border transition ${
                          isActive ? 'border-slate-900' : 'border-slate-200'
                        } ${isSavingColor ? 'cursor-not-allowed opacity-60' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Seleccionar color ${color}`}
                      />
                    );
                  })}
                </div>
              )}
              {isSavingColor && <span className="text-[11px] text-slate-400">Guardando color...</span>}
            </div>
          </CardContent>
        </Card>

        <Dialog open={abiertoDialogOpen} onOpenChange={setAbiertoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {data.abierto ? '¿Cerrar restaurante?' : '¿Reabrir restaurante?'}
              </DialogTitle>
              <DialogDescription>
                {data.abierto
                  ? 'Si cierras este restaurante, no será visible en el marketplace.'
                  : 'Al reabrirlo, volverá a estar visible para recibir reservas.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm text-slate-600">
              {data.abierto ? (
                <p>
                  Si cierras este restaurante, no será visible en el marketplace hasta que lo vuelvas a abrir.
                </p>
              ) : (
                <p>
                  Al reabrir este restaurante, volverá a ser visible en el marketplace para recibir reservas.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAbiertoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleToggleAbierto}
                className={data.abierto ? 'bg-rose-600 text-white' : 'bg-[#7472fd] text-white'}
                disabled={isTogglingAbierto}
              >
                {isTogglingAbierto
                  ? 'Actualizando...'
                  : data.abierto
                  ? 'Cerrar restaurante'
                  : 'Reabrir restaurante'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={introOpen} onOpenChange={setIntroOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Tu restaurante ya está listo para dar el siguiente paso</DialogTitle>
              <DialogDescription>
                Ahora solo te falta añadir menús, barras libres y tickets para que puedan solicitarte reservas desde el
                marketplace de Komvo.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button className="bg-[#7472fd] text-white" onClick={() => setIntroOpen(false)}>
                Entendido
              </Button>
            </div>
          </DialogContent>
        </Dialog>


          <RestauranteQuickLinks
            onOpen={{
              'info-general': () => setInfoOpen(true),
              responsable: () => setResponsableOpen(true),
              imagenes: () => setImagenesOpen(true),
              caracteristicas: () => setCaracteristicasOpen(true),
              horario: () => setHorarioOpen(true),
              carta: () => setCartaOpen(true),
              salas: () => setSalasOpen(true),
              raciones: () => setRacionesOpen(true),
              extras: () => setExtrasOpen(true),
              barra: () => setBarraOpen(true),
            }}
            onNavigate={{
              'datos-fiscales': () => router.push(`/restaurantes/${id}/datos-fiscales`),
              packs: () => {
                document.getElementById('packs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              },
            }}
          />

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <InfoGeneralCard
            restauranteId={id}
            data={data}
            presupuestoLabel={presupuestoLabel}
            onUpdated={async (next) => {
              setData(next);
              await refreshRestaurantes({ force: true });
            }}
            isOpen={infoOpen}
            onOpenChange={setInfoOpen}
          />
          <DatosFiscalesCard
            restauranteId={id}
            data={data}
            onNavigate={() => router.push(`/restaurantes/${id}/datos-fiscales`)}
          />
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr_1fr]">
          <ImagenesCard
            restauranteId={id}
            data={data}
            onUpdated={(next) => setData(next)}
            isOpen={imagenesOpen}
            onOpenChange={setImagenesOpen}
          />
          <HorarioCard
            restauranteId={id}
            horarioEntries={horarioEntries}
            horarioForm={horarioForm}
            data={data}
            onUpdated={(next) => setData(next)}
            isOpen={horarioOpen}
            onOpenChange={setHorarioOpen}
          />
          <ResponsableCard
            restauranteId={id}
            nombre={data.responsable?.nombre}
            telefono={data.responsable?.telefono}
            onUpdated={(next) =>
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      responsable: next,
                    }
                  : prev
              )
            }
            isOpen={responsableOpen}
            onOpenChange={setResponsableOpen}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-1">
          <CartaCard
            restauranteId={id}
            cartaItems={cartaItems}
            onUpdated={(items) =>
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      Carta: items.reduce<Record<string, { Nombre: string; url: string }>>((acc, item) => {
                        acc[item.key] = { Nombre: item.Nombre, url: item.url };
                        return acc;
                      }, {}),
                    }
                  : prev
              )
            }
            isOpen={cartaOpen}
            onOpenChange={setCartaOpen}
          />
        </section>

        <section id="caracteristicas" className="grid gap-6 lg:grid-cols-2">
          <CaracteristicasCard
            restauranteId={id}
            caracteristicas={data.caracteristicas}
            onUpdated={(next) =>
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      caracteristicas: next,
                    }
                  : prev
              )
            }
            isOpen={caracteristicasOpen}
            onOpenChange={setCaracteristicasOpen}
          />
          <SalasCard
            restauranteId={id}
            salas={normalizedSalas}
            restauranteCaracteristicas={data.caracteristicas}
            onUpdated={(next) =>
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      salas: next.map((sala) => ({
                        ...sala,
                        aforoMinimo: Number(sala.aforoMinimo ?? 0),
                        aforoMaximo: Number(sala.aforoMaximo ?? 0),
                        precioPrivatizacion: Number(sala.precioPrivatizacion ?? 0),
                        caracteristicas: sala.caracteristicas ?? {},
                      })),
                    }
                  : prev
              )
            }
            isOpen={salasOpen}
            onOpenChange={setSalasOpen}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <BarraCard
            restauranteId={id}
            consumiciones={normalizedConsumicionesBarra}
            onUpdated={(next) =>
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      consumicionesBarra: next.map((item) => ({
                        ...item,
                        precio: Number(item.precio ?? 0),
                      })),
                    }
                  : prev
              )
            }
            isOpen={barraOpen}
            onOpenChange={setBarraOpen}
          />
          <ExtrasCard
            restauranteId={id}
            extras={normalizedExtras}
            onUpdated={(next) =>
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      extras: next.map((item) => ({
                        ...item,
                        precio: Number(item.precio ?? 0),
                        tipoPrecio:
                          item.tipoPrecio === 'porHora' || item.tipoPrecio === 'porUnidad'
                            ? item.tipoPrecio
                            : 'fijo',
                        tipoIncremento:
                          item.tipoIncremento === 'porMediaHora'
                            ? 'porMediaHora'
                            : item.tipoIncremento === 'porHora'
                              ? 'porHora'
                              : undefined,
                        tiempoMinimoHoras:
                          item.tiempoMinimoHoras != null ? Number(item.tiempoMinimoHoras) : undefined,
                        unidadesMinimas:
                          item.unidadesMinimas != null ? Number(item.unidadesMinimas) : undefined,
                      })),
                    }
                  : prev
              )
            }
            isOpen={extrasOpen}
            onOpenChange={setExtrasOpen}
          />
          <RacionesCard
            restauranteId={id}
            raciones={
              normalizedRaciones ??
              raciones?.map((item) => ({
                ...item,
                precio: Number(item.precio ?? 0),
              }))
            }
            onUpdated={(next) =>
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      raciones: next.map((item) => ({
                        ...item,
                        precio: Number(item.precio ?? 0),
                      })),
                    }
                  : prev
              )
            }
            isOpen={racionesOpen}
            onOpenChange={setRacionesOpen}
          />
        </section>

        <section id="packs">
          <PacksCard
            packs={packs}
            allPacks={allPacks}
            restauranteId={id}
            salas={data.salas}
            onOpenSalas={() => setSalasOpen(true)}
            onEditPack={(packId) => router.push(`/packs/${packId}?restauranteId=${id}`)}
            onCreatePack={async (type) => {
              if (creatingPack || !data) return;
              const ownerId = data.idPropietario || (await AuthService.getCurrentPartner())?.id;
              if (!ownerId) return;
              setCreatingPack(type);
              try {
                const payload =
                  type === 'menus'
                    ? { categoria: 'Menú' as const, subcategoria: null, nombre: 'Menús cerrados para grupos' }
                    : type === 'tickets'
                    ? { categoria: 'Tickets' as const, subcategoria: null, nombre: 'Tickets de consumiciones' }
                    : {
                        categoria: 'Best Deal' as const,
                        subcategoria: 'Barra Libre' as const,
                        nombre: 'Barras Libres',
                      };
                const packId = await PackEditService.createPack({
                  ownerId,
                  categoria: payload.categoria,
                  subcategoria: payload.subcategoria,
                  nombre: payload.nombre,
                });
                router.push(`/packs/${packId}?restauranteId=${id}`);
              } finally {
                setCreatingPack(null);
              }
            }}
          />
        </section>
      </div>
    </div>
  );
}
