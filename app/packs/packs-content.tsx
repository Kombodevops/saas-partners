'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, ChevronRight, FolderPlus, PackageOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/services/auth.service';
import { PackDetalleService } from '@/lib/services/pack-detalle.service';
import { PacksService } from '@/lib/services/packs.service';
import { useRestaurantes } from '@/components/shared/restaurantes-context';
import type { PackResumen } from '@/lib/types/pack';
import type { PackDetalle } from '@/lib/services/pack-detalle.service';
import type { Partner } from '@/lib/types/partner';

export function PacksContent() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [packs, setPacks] = useState<PackResumen[]>([]);
  const [packDetalles, setPackDetalles] = useState<PackDetalle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { restaurantes, isLoading: restaurantesLoading } = useRestaurantes();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const partnerData = await AuthService.getCurrentPartner();
        if (!partnerData) {
          router.push('/login');
          return;
        }

        if (!active) return;
        setPartner(partnerData);

        const [packsData, packDetallesData] = await Promise.all([
          PacksService.getPacksByOwnerId(partnerData.id),
          PackDetalleService.getPacksByOwner(partnerData.id),
        ]);
        if (!active) return;
        setPacks(packsData);
        setPackDetalles(packDetallesData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Error inesperado al cargar planes');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (!user && active) {
        router.push('/login');
        return;
      }
      load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  const hasRestaurantes = restaurantes.length > 0;
  const hasPacks = packs.length > 0;

  const statusTitle = useMemo(() => {
    if (!hasRestaurantes) return 'Primero crea tu primer restaurante';
    if (!hasPacks) return 'Aún no tienes planes creados';
    return 'Todos tus planes';
  }, [hasRestaurantes, hasPacks]);

  const activeCount = useMemo(() => packs.filter((pack) => pack.activo).length, [packs]);
  const packDetallesById = useMemo(() => new Map(packDetalles.map((pack) => [pack.id, pack])), [packDetalles]);
  const packsWithDetails = useMemo(
    () => packs.map((pack) => ({ resumen: pack, detalle: packDetallesById.get(pack.id) })),
    [packs, packDetallesById]
  );
  const resumenPacks = useMemo(() => packsWithDetails.slice(0, 3), [packsWithDetails]);
  const formatPriceRange = (values: Array<number | undefined>) => {
    const normalized = values.map((value) => (Number.isFinite(value as number) ? Number(value) : 0)).filter((v) => v > 0);
    if (normalized.length === 0) return '—';
    const min = Math.min(...normalized);
    const max = Math.max(...normalized);
    if (min === max) return `${min}€`;
    return `${min}€ - ${max}€`;
  };

  if (isLoading || restaurantesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="h-10 w-56 animate-pulse rounded-2xl bg-white" />
          <div className="h-48 w-full animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-none items-center justify-between px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7472fd] text-white">
              <PackageOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Planes</p>
              <h1 className="text-xl font-semibold text-slate-900">Gestiona tus planes</h1>
            </div>
          </div>
          {hasRestaurantes && !hasPacks && (
            <Button className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]" onClick={() => router.push('/dashboard/restaurantes')}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Crear primer pack
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-none px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                <Sparkles className="h-5 w-5 text-[#7472fd]" />
                {statusTitle}
              </CardTitle>
              <CardDescription className="text-slate-500">
                {hasRestaurantes
                  ? 'Los planes se crean desde un restaurante y luego se reutilizan en todo tu catálogo.'
                  : 'Los planes dependen de un restaurante, crea el primero para continuar.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              {!hasRestaurantes && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Necesitas al menos un restaurante para crear planes.</p>
                  </div>
                  <Button className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]" onClick={() => router.push('/restaurantes/new')}>
                    Crear restaurante
                  </Button>
                </div>
              )}

              {hasRestaurantes && !hasPacks && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-slate-600">
                    Ve a un restaurante y añade el pack que necesites (menús, barras libres o tickets).
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {restaurantes.map((rest) => (
                      <button
                        key={rest.id}
                        type="button"
                        onClick={() => router.push(`/restaurantes/${rest.id}`)}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-[#7472fd]/40 hover:bg-[#7472fd]/5"
                      >
                        <span className="truncate">{rest.nombreRestaurante || 'Restaurante sin nombre'}</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasPacks && (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3">
                    {packs.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => router.push(`/packs/${pack.id}`)}
                        className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm transition hover:border-[#7472fd]/40 hover:shadow"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{pack.nombre || 'Plan sin nombre'}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              pack.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {pack.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {pack.descripcion || 'Sin descripción'}
                        </p>
                        <div className="text-[11px] text-slate-400">
                          {pack.categoria || 'Plan'} {pack.subcategoria ? `· ${pack.subcategoria}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-[#10102f] via-[#151641] to-[#1b1c52] text-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Vista rápida</CardTitle>
              <CardDescription className="text-slate-300">
                Resumen de tu catálogo y estado de publicación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Planes activos</p>
                <p className="mt-2 text-3xl font-semibold text-white">{activeCount}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total de planes</p>
                <p className="mt-2 text-3xl font-semibold text-white">{packs.length}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <BadgeCheck className="h-4 w-4 text-[#e2ff00]" />
                Mantén descripciones claras para mejorar la conversión.
              </div>
            </CardContent>
          </Card>
        </div>

        {hasPacks && (
          <Card className="mt-6 w-full border-none bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Resumen de tus planes</CardTitle>
              <CardDescription className="text-slate-500">
                Vista rápida con datos clave de tus 3 packs principales.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {resumenPacks.map(({ resumen, detalle }) => {
                  const categoria = resumen.categoria ?? detalle?.Categoria ?? '';
                  const subcategoria = resumen.subcategoria ?? detalle?.Subcategoria ?? '';
                  const isMenus = categoria === 'Menú';
                  const isTickets = categoria === 'Tickets';
                  const isBarras = subcategoria === 'Barra Libre';
                  const isBestDeal = categoria === 'Best Deal';
                  const menus = detalle?.Menus ?? [];
                  const tickets = detalle?.Tickets ?? [];
                  const barras = detalle?.['Barra Libre'] ?? [];
                  return (
                    <div key={`${resumen.id}-summary`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{resumen.nombre || 'Plan sin nombre'}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            resumen.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {resumen.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {categoria || 'Plan'} {subcategoria ? `· ${subcategoria}` : ''}
                      </div>
                      <div className="mt-3 space-y-3 text-xs text-slate-600">
                        {isMenus && (
                          <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Menús</p>
                            <div className="mt-2 space-y-1">
                              {menus.length === 0 && <p className="text-slate-400">Sin menús.</p>}
                              {menus.map((menu, index) => (
                                <div key={`${menu.Nombre}-${index}`} className="flex items-center justify-between">
                                  <span className="text-slate-700">{menu.Nombre || 'Menú'}</span>
                                  <span className="font-semibold text-slate-900">{menu.Precio ?? 0}€</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isTickets && (
                          <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tickets</p>
                            <div className="mt-2 space-y-1">
                              {tickets.length === 0 && <p className="text-slate-400">Sin tickets.</p>}
                              {tickets.map((ticket, index) => (
                                <div key={`${ticket.Nombre}-${index}`} className="flex items-center justify-between">
                                  <span className="text-slate-700">{ticket.Nombre || 'Ticket'}</span>
                                  <span className="font-semibold text-slate-900">{ticket.Precio ?? 0}€</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isBarras && (
                          <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Barras libres</p>
                            <div className="mt-2 space-y-2">
                              {barras.length === 0 && <p className="text-slate-400">Sin barras libres.</p>}
                              {barras.map((barra, index) => (
                                <div key={`${barra.Nombre}-${index}`}>
                                  <p className="text-slate-700">{barra.Nombre || 'Barra libre'}</p>
                                  <div className="mt-1 space-y-1">
                                    {(barra.intervalos ?? []).length === 0 && (
                                      <p className="text-slate-400">Sin intervalos.</p>
                                    )}
                                    {(barra.intervalos ?? []).map((intervalo, intervalIndex) => (
                                      <div key={`intervalo-${intervalIndex}`} className="flex items-center justify-between text-[11px] text-slate-600">
                                        <span>
                                          {intervalo.duracionMin || '—'} - {intervalo.duracionMax || '—'}
                                        </span>
                                        <span className="font-semibold text-slate-900">{intervalo.precio ?? 0}€</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isBestDeal && !isBarras && (
                          <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Resumen</p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div className="rounded-md bg-slate-50 px-2 py-1">
                                Menús: <span className="font-semibold text-slate-900">{menus.length}</span>
                              </div>
                              <div className="rounded-md bg-slate-50 px-2 py-1">
                                Tickets: <span className="font-semibold text-slate-900">{tickets.length}</span>
                              </div>
                              <div className="rounded-md bg-slate-50 px-2 py-1">
                                Barras: <span className="font-semibold text-slate-900">{barras.length}</span>
                              </div>
                              <div className="rounded-md bg-slate-50 px-2 py-1">
                                Precio: <span className="font-semibold text-slate-900">{resumen.precio ?? 0}€</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {packs.length < 3 && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Para completar el resumen visual, crea hasta 3 packs.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
