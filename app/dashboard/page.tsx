'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  ClipboardCopy,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  {
    label: 'Ingresos hoy',
    value: '€2.450',
    change: '+12% vs ayer',
  },
  {
    label: 'Reservas confirmadas',
    value: '24',
    change: '6 pendientes',
  },
  {
    label: 'Cubiertos totales',
    value: '182',
    change: 'Capacidad 76%',
  },
];

const reservas = [
  {
    id: 'rv-1',
    grupo: 'Cena corporativa 18p',
    origen: 'Marketplace',
    fecha: 'Hoy, 21:00',
    alergias: true,
    restaurante: 'La Esquina de la Jaula',
  },
  {
    id: 'rv-2',
    grupo: 'Afterwork 30p',
    origen: 'Directo',
    fecha: 'Mañana, 19:30',
    alergias: false,
    restaurante: 'Terraza Salamanca',
  },
  {
    id: 'rv-3',
    grupo: 'Cumpleanos 12p',
    origen: 'Marketplace',
    fecha: 'Sab, 13:00',
    alergias: true,
    restaurante: 'Komvo Club',
  },
];

const actividad = [
  {
    id: 'act-1',
    title: 'Nueva reserva confirmada',
    detail: 'Mesa de 10, La Esquina de la Jaula',
    time: 'Hace 15 min',
    type: 'reserva',
  },
  {
    id: 'act-2',
    title: 'Alergia critica reportada',
    detail: 'Sin gluten, reserva corporativa',
    time: 'Hace 40 min',
    type: 'alerta',
  },
  {
    id: 'act-3',
    title: 'Nuevo mensaje',
    detail: 'Organizer: Cambiamos horario',
    time: 'Hace 1 h',
    type: 'chat',
  },
];

export default function DashboardPage() {
  const [copied, setCopied] = useState(false);
  const link = 'https://komvo.app/reservas/partner/kombodevops';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const reservasMarketplace = useMemo(
    () => reservas.filter((item) => item.origen === 'Marketplace').length,
    []
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-[#7472fd]" />
              Metricas rapidas
            </CardTitle>
            <CardDescription>Resumen operativo del dia.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.change}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none bg-[#10102f] text-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-[#e2ff00]" />
              Modulo Web
            </CardTitle>
            <CardDescription className="text-slate-300">
              Comparte tu enlace de reservas directas con tu audiencia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-white/10 p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tu enlace</p>
              <p className="mt-2 break-all font-medium">{link}</p>
            </div>
            <Button
              className="w-full bg-[#e2ff00] text-[#10102f] hover:bg-[#d6ef00]"
              onClick={handleCopy}
            >
              <ClipboardCopy className="mr-2 h-4 w-4" />
              {copied ? 'Copiado' : 'Copiar enlace de reserva directa'}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-[#7472fd]" />
              Reservas en curso
            </CardTitle>
            <CardDescription>
              {reservasMarketplace} de {reservas.length} vienen del Marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reservas.map((reserva) => (
              <div
                key={reserva.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">{reserva.grupo}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        reserva.origen === 'Marketplace'
                          ? 'bg-[#7472fd]/10 text-[#7472fd]'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {reserva.origen}
                    </span>
                    {reserva.alergias && (
                      <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Alergias
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    {reserva.restaurante} · {reserva.fecha}
                  </div>
                </div>
                <Button variant="outline" className="gap-2">
                  Ver detalle
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-[#7472fd]" />
              Actividad reciente
            </CardTitle>
            <CardDescription>Alertas, mensajes y movimientos clave.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {actividad.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <span className="text-xs text-slate-400">{item.time}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="h-5 w-5 text-[#7472fd]" />
              Restaurantes
            </CardTitle>
            <CardDescription>Gestiona tus locales y disponibilidad.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-[#7472fd] text-white hover:bg-[#5f5bf2]">Ver locales</Button>
          </CardContent>
        </Card>
        <Card className="border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-[#7472fd]" />
              Planes
            </CardTitle>
            <CardDescription>Menues, barras libres y tickets.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Gestionar packs
            </Button>
          </CardContent>
        </Card>
        <Card className="border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-[#7472fd]" />
              Chats
            </CardTitle>
            <CardDescription>Conversaciones con organizadores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Abrir chat
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
