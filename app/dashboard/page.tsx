'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CalendarDays, MessageCircle, Timer } from 'lucide-react';
import Link from 'next/link';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { AuthService } from '@/lib/services/auth.service';
import { ReservasService, type ReservaItem } from '@/lib/services/reservas.service';
import { ChatsService } from '@/lib/services/chats.service';
import { ReservaDetalleService } from '@/lib/services/reserva-detalle.service';
import { ReservaDocSchema } from '@/lib/validators/reserva';

const formatReservaFecha = (value?: string) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};

const getEstadoBadge = (estado?: string) => {
  const key = (estado ?? '').toLowerCase();
  if (key === 'pendiente') return { label: 'Consulta de disponibilidad', className: 'bg-[#0D81DD1F] text-[#0D81DD]' };
  if (key === 'pendientegestion') return { label: 'Esperando confirmación', className: 'bg-[#FF22C01F] text-[#FF22C0]' };
  if (key === 'pendientecambio') return { label: 'Solicitud de cambio', className: 'bg-[#FFC32A1F] text-[#FFC32A]' };
  if (key === 'cambiorechazado') return { label: 'Esperando reconfirmación', className: 'bg-[#FFC32A1F] text-[#FFC32A]' };
  if (key === 'pendienteasistentes') return { label: 'Pendiente de asistentes', className: 'bg-[#FF9A191F] text-[#FF9A19]' };
  if (key === 'expirado') return { label: 'Expirada', className: 'bg-slate-100 text-slate-600' };
  if (key === 'no_gestionado') return { label: 'No gestionado', className: 'bg-slate-100 text-slate-600' };
  return { label: estado || 'Sin estado', className: 'bg-slate-100 text-slate-600' };
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [actionReservas, setActionReservas] = useState<ReservaItem[]>([]);
  const [weekReservas, setWeekReservas] = useState<ReservaItem[]>([]);
  const [actionCount, setActionCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChats, setUnreadChats] = useState<Array<{ id: string; nombre: string; unread: number }>>([]);
  const [activeWeekDay, setActiveWeekDay] = useState<string | null>(null);

  const heatDays = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(today);
      date.setDate(today.getDate() + idx);
      const key = date.toISOString().slice(0, 10);
      return { key, label: date.toLocaleDateString('es-ES', { weekday: 'short' }) };
    });
    const counts: Record<string, number> = {};
    const details: Record<string, Array<{ cliente: string; plan: string }>> = {};
    weekReservas.forEach((reserva) => {
      const dateKey = reserva.kombo?.Fecha ? reserva.kombo.Fecha.slice(0, 10) : '';
      if (!dateKey) return;
      counts[dateKey] = (counts[dateKey] ?? 0) + 1;
      const cliente = reserva.usuario?.['Nombre de usuario'] || 'Cliente';
      const plan = reserva.pack?.['Nombre del pack'] || reserva.kombo?.['Nombre del kombo'] || 'Plan';
      if (!details[dateKey]) details[dateKey] = [];
      details[dateKey].push({ cliente, plan });
    });
    return days.map((day) => ({ ...day, count: counts[day.key] ?? 0, items: details[day.key] ?? [] }));
  }, [weekReservas]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const partnerId = await AuthService.getCurrentPartnerId();
      if (!partnerId) {
        if (active) setLoading(false);
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setDate(today.getDate() + 6);
      const startKey = today.toISOString().slice(0, 10);
      const endKey = end.toISOString().slice(0, 10);

      const [page, counts, chats, weekSnapshot] = await Promise.all([
        ReservasService.getReservasPage({
          partnerId,
          filter: 'requiereAccion',
          pageSize: 5,
          sortBy: 'fecha_asc',
        }),
        ReservasService.getCountsByPartnerId({ partnerId }),
        ChatsService.getChatsPage({ partnerId, pageSize: 12, onlyActive: true }),
        getDocs(
          query(
            collection(db, 'reservas'),
            where('partnerId', '==', partnerId),
            where('kombo.Fecha', '>=', startKey),
            where('kombo.Fecha', '<=', `${endKey}\uf8ff`),
            orderBy('kombo.Fecha', 'asc')
          )
        ),
      ]);
      const unreadEntries = await Promise.all(
        chats.chats.map((chat) => ReservaDetalleService.getChatInbox({ chatId: chat.id, partnerId }))
      );
      const unreadNameEntries = await Promise.all(
        chats.chats.map((chat) => ReservasService.getById(chat.reservaId || '').catch(() => null))
      );
      const totalUnread = unreadEntries.reduce((acc, entry) => acc + (entry.unreadCount ?? 0), 0);
      const chatUnreadList = chats.chats
        .map((chat, idx) => {
          const unread = unreadEntries[idx]?.unreadCount ?? 0;
          const reserva = unreadNameEntries[idx];
          const nombre = reserva?.usuario?.['Nombre de usuario'] || 'Cliente';
          return { id: chat.id, nombre, unread };
        })
        .filter((item) => item.unread > 0)
        .slice(0, 6);
      if (!active) return;
      setActionReservas(page.items);
      setActionCount(counts.requiereAccion ?? page.items.length);
      const weekItems = weekSnapshot.docs
        .map((doc) => ({ id: doc.id, ...ReservaDocSchema.parse(doc.data()) }))
        .filter((reserva) => (reserva.estado ?? '').toLowerCase() !== 'fallado');
      setWeekReservas(weekItems);
      setUnreadCount(totalUnread);
      setUnreadChats(chatUnreadList);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-100 bg-gradient-to-r from-white via-[#f7f7ff] to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hoy en un vistazo</p>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-900">Estado del día</h2>
              <span className="rounded-full bg-[#7472fd]/10 px-3 py-1 text-xs font-semibold text-[#3b3af2]">
                {loading ? 'Cargando' : actionCount > 0 ? 'Acción necesaria' : 'Todo al día'}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {loading ? 'Recopilando actividad y reservas.' : 'Sigue el pulso operativo del día.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/reservas"
              prefetch={false}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 transition hover:border-[#7472fd]/40 hover:bg-[#7472fd]/5"
            >
              <div className="h-12 w-12 rounded-full bg-[#7472fd]/10 text-[#3b3af2] flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <p className="text-xs text-slate-500">Acciones</p>
              <p className="text-xl font-semibold text-slate-900">{loading ? '—' : actionCount}</p>
            </Link>
            <Link
              href="/dashboard/chats"
              prefetch={false}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 transition hover:border-[#7472fd]/40 hover:bg-[#7472fd]/5"
            >
              <div className="h-12 w-12 rounded-full bg-[#7472fd]/10 text-[#3b3af2] flex items-center justify-center">
                <MessageCircle className="h-5 w-5" />
              </div>
              <p className="text-xs text-slate-500">Mensajes</p>
              <p className="text-xl font-semibold text-slate-900">{loading ? '—' : unreadCount}</p>
            </Link>
          </div>
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Timer className="h-5 w-5 text-[#7472fd]" />
                Actividad de la semana
              </CardTitle>
              <CardDescription>Reservas de los próximos 7 días.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-500">
                  Cargando reservas de la semana...
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {heatDays.map((day) => {
                      const isActive = activeWeekDay === day.key;
                      return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => setActiveWeekDay(isActive ? null : day.key)}
                        className="group relative flex flex-col items-center gap-1"
                      >
                        <div
                          className={`h-10 w-4 rounded-full ${
                            day.count >= 3
                              ? 'bg-[#4f46e5]'
                              : day.count === 2
                                ? 'bg-[#7472fd]'
                                : day.count === 1
                                  ? 'bg-[#7472fd]/45'
                                  : 'bg-slate-100'
                          }`}
                        />
                        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                          {day.label}
                        </span>
                        <div
                          className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 text-[11px] text-slate-600 shadow-sm transition-opacity duration-150 ${
                            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {day.count > 0 ? (
                            <div className="space-y-1">
                              {day.items.map((item, idx) => (
                                <div key={`${day.key}-${idx}`} className="flex flex-col">
                                  <span className="font-semibold text-slate-800">{item.cliente}</span>
                                  <span className="text-slate-500">{item.plan}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span>Sin reservas</span>
                          )}
                        </div>
                      </button>
                    )})}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-[#7472fd]" />
                Reservas en curso
              </CardTitle>
              <CardDescription>
                {loading
                  ? 'Cargando reservas que requieren acción...'
                  : actionCount > 0
                    ? `Tienes ${actionCount} reservas que requieren acción.`
                    : 'No tienes reservas pendientes de acción.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && (
                <div className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-500">
                  Cargando reservas...
                </div>
              )}
              {!loading && actionReservas.length === 0 && (
                <div className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-500">
                  No hay reservas con acción pendiente.
                </div>
              )}
              {actionReservas.map((reserva) => {
                const cliente = reserva.usuario?.['Nombre de usuario'] || 'Cliente';
                const plan = reserva.pack?.['Nombre del pack'] || reserva.kombo?.['Nombre del kombo'] || 'Plan';
                const estadoBadge = getEstadoBadge(reserva.estado);
                return (
                  <div
                    key={reserva.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{cliente}</p>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${estadoBadge.className}`}>
                          {estadoBadge.label}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500">
                        {plan} · {formatReservaFecha(reserva.kombo?.Fecha)}
                      </div>
                    </div>
                    <Button asChild variant="outline" className="gap-2">
                      <Link href="/dashboard/reservas" prefetch={false}>
                        Ver reservas
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="h-5 w-5 text-[#7472fd]" />
                Actividad reciente
              </CardTitle>
              <CardDescription>Mensajes y movimientos clave.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-500">
                  Cargando actividad...
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Mensajes sin leer</p>
                      <span className="text-xs text-slate-400">Chats</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {unreadCount > 0
                        ? `Tienes ${unreadCount} mensajes sin leer.`
                        : 'No tienes mensajes sin leer.'}
                    </p>
                    {unreadChats.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {unreadChats.map((chat) => (
                          <div
                            key={chat.id}
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                          >
                            <span className="font-semibold text-slate-800">{chat.nombre}</span>
                            <span className="rounded-full bg-[#7472fd]/10 px-2 py-0.5 text-[11px] font-semibold text-[#3b3af2]">
                              {chat.unread}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3">
                      <Button asChild variant="outline" className="gap-2">
                        <Link href="/dashboard/chats" prefetch={false}>
                          Ir a chats
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
