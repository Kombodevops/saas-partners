'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Plus,
  Store,
  UtensilsCrossed,
  MenuSquare,
  ChevronRight,
  AlertCircle,
  ImageIcon,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRestaurantes } from '@/components/shared/restaurantes-context';

export function RestaurantesContent() {
  const { restaurantes, isLoading } = useRestaurantes();
  const router = useRouter();
  const tips = useMemo(
    () => [
      {
        title: 'Cartas siempre actualizadas',
        description: 'Las cartas al día generan más confianza y suben la conversión.',
      },
      {
        title: 'Primera impresión impecable',
        description: 'La primera imagen es clave: usa la mejor foto del local.',
      },
      {
        title: 'Planes claros y atractivos',
        description: 'Describe bien lo que incluye cada plan para evitar dudas.',
      },
      {
        title: 'Responde rápido a los clientes',
        description: 'Una respuesta rápida aumenta cierres y valoraciones.',
      },
      {
        title: 'Precios competitivos',
        description: 'Un rango competitivo mejora tu posicionamiento en el marketplace.',
      },
      {
        title: 'Salas bien definidas',
        description: 'Aforo y descripción claros ayudan a elegir más rápido.',
      },
      {
        title: 'Disponibilidad por día',
        description: 'Mantén días y horarios actualizados para evitar rechazos.',
      },
    ],
    []
  );
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 6000);
    return () => clearInterval(id);
  }, [tips.length]);

  const totalRestaurantes = useMemo(() => restaurantes.length, [restaurantes.length]);
  const abiertosCount = useMemo(() => restaurantes.filter((item) => item.abierto).length, [restaurantes]);
  const cartaCount = useMemo(() => restaurantes.filter((item) => item.cartaDisponible).length, [restaurantes]);

  const health = useMemo(() => {
    if (restaurantes.length === 0) {
      return { score: 0, missingRaciones: 0, missingExtras: 0, missingCarta: 0, missingImagenes: 0 };
    }
    let totalScore = 0;
    let missingCarta = 0;
    let missingRaciones = 0;
    let missingExtras = 0;
    let missingImagenes = 0;

    restaurantes.forEach((rest) => {
      let points = 0;
      const hasCarta = Boolean(rest.cartaDisponible);
      const hasRaciones = Boolean(rest.tieneRaciones);
      const hasExtras = Boolean(rest.tieneExtras);
      const hasImagenes = Boolean(rest.tieneMasDeUnaImagen);

      if (hasCarta) points += 25;
      else missingCarta += 1;
      if (hasRaciones) points += 25;
      else missingRaciones += 1;
      if (hasExtras) points += 25;
      else missingExtras += 1;
      if (hasImagenes) points += 25;
      else missingImagenes += 1;

      totalScore += points;
    });

    return {
      score: Math.round(totalScore / restaurantes.length),
      missingRaciones,
      missingExtras,
      missingCarta,
      missingImagenes,
    };
  }, [restaurantes]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-none items-center justify-between px-4 py-6">
          <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7472fd] text-white">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Restaurantes</p>
                <h1 className="text-xl font-semibold text-slate-900">Gestiona tus locales</h1>
              </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
              onClick={() => router.push('/restaurantes/new')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Anadir restaurante
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-none px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Resumen</p>
              <h2 className="text-lg font-semibold text-slate-900">Estado general</h2>
              <p className="text-sm text-slate-500">
                Visualiza el estado de tus restaurantes y accede rapidamente a cada ficha.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Salud del perfil</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{health.score}</p>
                    <p className="text-xs text-slate-500">De 100 puntos</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7472fd]/10 text-[#3b3af2]">
                    <Store className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-[#7472fd]"
                      style={{ width: `${health.score}%` }}
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <span>Sin raciones: {health.missingRaciones}</span>
                  <span>Sin extras: {health.missingExtras}</span>
                  <span>Sin carta: {health.missingCarta}</span>
                  <span>Sin más de una imagen: {health.missingImagenes}</span>
                </div>
              </div>
            </div>
          </div>

          <Card className="border-none bg-[#10102f] text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Consejo rápido</CardTitle>
              <CardDescription className="text-slate-300">
                Tips para posicionarte mejor en el marketplace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e2ff00] text-[#10102f]">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{tips[tipIndex].title}</p>
                  <p className="text-xs text-slate-300">{tips[tipIndex].description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                <div className="flex gap-2">
                  {tips.map((_, index) => (
                    <button
                      key={`tip-${index}`}
                      type="button"
                      onClick={() => setTipIndex(index)}
                      className={`h-2 w-2 rounded-full transition ${
                        index === tipIndex ? 'bg-[#e2ff00]' : 'bg-white/30'
                      }`}
                      aria-label={`Consejo ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipIndex((prev) => (prev - 1 + tips.length) % tips.length)}
                    className="rounded-full border border-white/20 px-2 py-1 text-[11px] text-slate-200 hover:border-white/40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipIndex((prev) => (prev + 1) % tips.length)}
                    className="rounded-full border border-white/20 px-2 py-1 text-[11px] text-slate-200 hover:border-white/40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mis restaurantes</h2>
              <p className="text-sm text-slate-500">Gestiona direccion, estado y carta disponible.</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {isLoading ? (
              <Card className="border-none bg-white shadow-sm">
                <CardContent className="py-10 text-sm text-slate-500">Cargando restaurantes...</CardContent>
              </Card>
            ) : restaurantes.length === 0 ? (
              <Card className="border-none bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-slate-800">Todavia no hay restaurantes</CardTitle>
                  <CardDescription className="text-slate-500">
                    Crea tu primer restaurante para empezar a recibir reservas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
                    onClick={() => router.push('/restaurantes/new')}
                  >
                    Anadir restaurante
                  </Button>
                </CardContent>
              </Card>
            ) : (
              restaurantes.map((restaurante) => {
                const cover = restaurante.logoRestaurante?.[0];
                const missingProfile = [
                  !restaurante.tieneRaciones ? 'Sin raciones' : null,
                  !restaurante.tieneExtras ? 'Sin extras' : null,
                  !restaurante.cartaDisponible ? 'Sin carta' : null,
                  !restaurante.tieneMasDeUnaImagen ? 'Sin más de una imagen' : null,
                ].filter(Boolean) as string[];
                return (
                  <Card key={restaurante.id} className="border-none bg-white shadow-sm">
                    <CardContent className="grid gap-4 p-5 sm:grid-cols-[140px_1fr_auto] sm:items-center">
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        {cover ? (
                          <img
                            src={cover}
                            alt={restaurante.nombreRestaurante || 'Restaurante'}
                            className="h-full w-full rounded-2xl object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6" />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {restaurante.nombreRestaurante || 'Restaurante sin nombre'}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              restaurante.abierto
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {restaurante.abierto ? 'Abierto' : 'Cerrado'}
                          </span>
                          {missingProfile.length > 0 && (
                            <div className="group relative flex items-center gap-1 rounded-full bg-[#7472fd]/10 px-2 py-1 text-xs font-semibold text-[#3b3af2]">
                              <Info className="h-3.5 w-3.5" />
                              Completa el perfil
                              <div className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 w-56 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                                <p className="font-semibold text-slate-700">Mejora la conversión</p>
                                <p className="mt-1">Faltan:</p>
                                <ul className="mt-1 list-disc pl-4">
                                  {missingProfile.map((item) => (
                                    <li key={`${restaurante.id}-${item}`}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                          {!restaurante.stripeAccountId && (
                            <button
                              type="button"
                              onClick={() => router.push(`/restaurantes/${restaurante.id}/datos-fiscales`)}
                              className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                              Confirma datos fiscales y pagos
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {restaurante.direccion || restaurante.ubicacion || 'Sin direccion'}
                          </span>
                          <span className="flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4" />
                            {restaurante.tipoCocina || 'Tipo de cocina sin definir'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {!restaurante.tieneRaciones && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-slate-500">
                              Sin raciones
                            </span>
                          )}
                          {!restaurante.tieneExtras && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-slate-500">
                              Sin extras
                            </span>
                          )}
                          {!restaurante.cartaDisponible && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-slate-500">
                              Sin carta
                            </span>
                          )}
                          {!restaurante.tieneMasDeUnaImagen && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-slate-500">
                              Sin más de una imagen
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          className="gap-2 border-slate-200 text-slate-600"
                          onClick={() => router.push(`/restaurantes/${restaurante.id}`)}
                        >
                          Ver detalles
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
