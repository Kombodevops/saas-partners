'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Link as LinkIcon, Monitor, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/services/auth.service';
import { RestauranteDetalleService } from '@/lib/services/restaurante-detalle.service';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';

interface WebRestaurantePageProps {
  params: Promise<{ id: string }>;
}

export default function WebRestaurantePage({ params }: WebRestaurantePageProps) {
  const { id } = use(params);
  const [restaurante, setRestaurante] = useState<RestauranteDetalleDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const partner = await AuthService.getCurrentPartner();
        if (!partner) {
          router.push('/login');
          return;
        }
        const data = await RestauranteDetalleService.getRestauranteById(id);
        if (!active) return;
        if (!data) {
          setError('No se encontró el restaurante');
          return;
        }
        setRestaurante(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Error al cargar el restaurante');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id, router]);

  const baseUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return process.env.NEXT_PUBLIC_WEB_URL || window.location.origin;
    }
    return process.env.NEXT_PUBLIC_WEB_URL || '';
  }, []);

  const iframeUrl = useMemo(() => `${baseUrl}/if/restaurantes/${id}`, [baseUrl, id]);
  const htmlCode = useMemo(
    () => `<iframe 
  src="${iframeUrl}"
  width="100%" 
  height="720"
  frameborder="0"
  title="Planes de ${restaurante?.['Nombre del restaurante'] ?? 'restaurante'} - Komvo"
  style="border: none; border-radius: 12px; box-shadow: 0 12px 30px rgba(15,23,42,0.12);"
></iframe>`,
    [iframeUrl, restaurante]
  );

  const cssCode = useMemo(
    () => `/* Estilos para el contenedor del iframe */
.komvo-iframe-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Estilos para el iframe */
.komvo-iframe {
  border: none;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
}`,
    []
  );

  const handleCopy = async (value: string, key?: string) => {
    await navigator.clipboard.writeText(value);
    if (key) {
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <div className="h-12 w-48 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-40 w-full animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (error || !restaurante) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <Card className="border-dashed border-rose-200 bg-rose-50">
            <CardHeader>
              <CardTitle className="text-base text-rose-600">{error ?? 'Error inesperado'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => router.push('/dashboard/web')}>
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white px-4 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Card className="border-none bg-white shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7472fd]/10 text-[#3b3af2]">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Integración Web</p>
                <h1 className="text-xl font-semibold text-slate-900">
                  {restaurante['Nombre del restaurante']}
                </h1>
                <p className="text-sm text-slate-500">{restaurante['Ubicación']}</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => router.push('/dashboard/web')}>
              <ArrowLeft className="h-4 w-4" />
              Volver a Web
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Dos formas de integrar</CardTitle>
              <CardDescription className="text-slate-500">
                Inserta el iframe en tu web o comparte el enlace directo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <Monitor className="mt-0.5 h-4 w-4 text-[#7472fd]" />
                <div>
                  <p className="font-semibold text-slate-900">Iframe integrado</p>
                  <p className="text-xs text-slate-500">
                    Copia el código HTML y pégalo donde quieras mostrar los planes en tu web.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <LinkIcon className="mt-0.5 h-4 w-4 text-[#7472fd]" />
                <div>
                  <p className="font-semibold text-slate-900">URL directa</p>
                  <p className="text-xs text-slate-500">
                    Comparte el enlace en redes sociales, campañas o email marketing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-[#10102f] text-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">URL del iframe</CardTitle>
              <CardDescription className="text-slate-300">
                Usa esta URL si quieres enlazar sin incrustar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl bg-white/10 p-4 text-sm break-all">{iframeUrl}</div>
              <Button
                className="w-full bg-[#e2ff00] text-[#10102f] hover:bg-[#d6ef00]"
                onClick={() => handleCopy(iframeUrl, 'iframeUrl')}
              >
                <Copy className="mr-2 h-4 w-4" />
                {copiedKey === 'iframeUrl' ? 'Copiado' : 'Copiar URL'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Vista previa</CardTitle>
            <CardDescription className="text-slate-500">
              Así se verán los planes cuando incrustes el iframe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <iframe
                src={iframeUrl}
                title={`Vista previa de ${restaurante['Nombre del restaurante']}`}
                className="h-[560px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Código HTML del iframe</CardTitle>
            <CardDescription className="text-slate-500">Pega este código en tu web.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-100 overflow-x-auto">{htmlCode}</pre>
            <Button
              className="bg-[#7472fd] text-white hover:bg-[#5f5bf2]"
              onClick={() => handleCopy(htmlCode, 'html')}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copiedKey === 'html' ? 'Copiado' : 'Copiar HTML'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">CSS opcional</CardTitle>
            <CardDescription className="text-slate-500">
              Si quieres destacar el iframe, añade estos estilos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-100 overflow-x-auto">{cssCode}</pre>
            <Button variant="outline" onClick={() => handleCopy(cssCode, 'css')}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedKey === 'css' ? 'Copiado' : 'Copiar CSS'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
