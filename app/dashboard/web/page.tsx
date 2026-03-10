'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardData } from '@/components/shared/dashboard-data-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Globe, Link as LinkIcon, Store } from 'lucide-react';

export default function DashboardWebPage() {
  const { restaurantes, isLoading, partner } = useDashboardData();
  const router = useRouter();
  const error = null;

  const hasRestaurantes = restaurantes.length > 0;
  const intro = useMemo(
    () => ({
      title: 'Activa tu motor de grupos Komvo',
      subtitle: 'Integra el iframe de reservas de grupo en la web de cada local en minutos.',
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-none items-center justify-between px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7472fd] text-white">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Web</p>
              <h1 className="text-xl font-semibold text-slate-900">{intro.title}</h1>
            </div>
          </div>
          <div />
        </div>
      </header>

      <main className="mx-auto w-full max-w-none px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">¿Qué es el iframe de Komvo?</CardTitle>
              <CardDescription className="text-slate-500">{intro.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>
                Inserta un iframe en tu web para que los clientes reserven planes de grupo, paguen por
                adelantado y gestionen invitados sin llamadas ni mensajes.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Pago garantizado</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Reduce cancelaciones y cobros pendientes con el pago anticipado.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Logística automática</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tus clientes gestionan invitados y menús desde el flujo Komvo.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Integración rápida</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Copia y pega el código HTML en tu web o comparte el enlace directo.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Marca blanca</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tus planes se integran en tu web sin fricción para el cliente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-[#10102f] text-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Dos formas de integrarlo</CardTitle>
              <CardDescription className="text-slate-300">
                Elige la opción que mejor encaja con tu web.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-200">
              <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4">
                <LinkIcon className="mt-0.5 h-4 w-4 text-[#e2ff00]" />
                <div>
                  <p className="font-semibold text-white">Iframe integrado</p>
                  <p className="text-xs text-slate-300">
                    Inserta el iframe para mostrar los planes dentro de tu web.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4">
                <ArrowRight className="mt-0.5 h-4 w-4 text-[#e2ff00]" />
                <div>
                  <p className="font-semibold text-white">URL directa</p>
                  <p className="text-xs text-slate-300">
                    Comparte el enlace en redes sociales o campañas de email.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Tus restaurantes</h2>
              <p className="text-sm text-slate-500">
                Selecciona un restaurante para obtener su iframe y la guía de integración.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {isLoading && (
              <Card className="border-none bg-white shadow-sm">
                <CardContent className="py-10 text-sm text-slate-500">Cargando restaurantes...</CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-rose-200 bg-rose-50">
                <CardHeader>
                  <CardTitle className="text-base text-rose-600">No pudimos cargar los restaurantes</CardTitle>
                  <CardDescription className="text-rose-500">{error}</CardDescription>
                </CardHeader>
              </Card>
            )}

            {!isLoading && !error && !hasRestaurantes && (
              <Card className="border-none bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-slate-800">No tienes restaurantes configurados</CardTitle>
                  <CardDescription className="text-slate-500">
                    Crea tu primer restaurante para activar el módulo web.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
                    onClick={() => router.push('/restaurantes/new')}
                  >
                    Crear restaurante
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isLoading &&
              !error &&
              restaurantes.map((rest) => (
                <Card key={rest.id} className="border-none bg-white shadow-sm">
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {rest.nombreRestaurante || 'Restaurante sin nombre'}
                        </p>
                        <p className="text-sm text-slate-500">{rest.ubicacion || rest.direccion || ''}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => router.push(`/web/${rest.id}`)}
                    >
                      Ver integración
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
