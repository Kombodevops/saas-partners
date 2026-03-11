'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  LogOut,
  Home,
  Store,
  Package,
  CalendarCheck,
  MessagesSquare,
  Receipt,
  Globe,
  BarChart3,
  Users,
  Menu,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AuthService } from '@/lib/services/auth.service';
import { PacksService } from '@/lib/services/packs.service';
import { ChatsService } from '@/lib/services/chats.service';
import { ReservaDetalleService } from '@/lib/services/reserva-detalle.service';
import type { Partner } from '@/lib/types/partner';
import type { RestauranteResumen } from '@/lib/types/restaurante';
import type { PackResumen } from '@/lib/types/pack';
import { DashboardDataProvider } from '@/components/shared/dashboard-data-context';
import { useRestaurantes } from '@/components/shared/restaurantes-context';

interface DashboardLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Reservas', href: '/dashboard/reservas' },
  { label: 'Chats', href: '/dashboard/chats' },
  { label: 'Equipo', href: '/dashboard/equipo' },
  { label: 'Web', href: '/dashboard/web' },
];

const toLabel = (value: string) => value.trim() || 'Sin nombre';

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [partner, setPartner] = useState<Partner | null>(() => {
    if (typeof window === 'undefined') return null;
    const cachedRaw = sessionStorage.getItem('komvo_sidebar_cache');
    if (!cachedRaw) return null;
    try {
      const cached = JSON.parse(cachedRaw) as { partner: Partner };
      return cached.partner ?? null;
    } catch {
      return null;
    }
  });
  const [restaurantes, setRestaurantes] = useState<RestauranteResumen[]>([]);
  const [packs, setPacks] = useState<PackResumen[]>(() => {
    if (typeof window === 'undefined') return [];
    const cachedRaw = sessionStorage.getItem('komvo_sidebar_cache');
    if (!cachedRaw) return [];
    try {
      const cached = JSON.parse(cachedRaw) as { packs: PackResumen[] };
      return cached.packs ?? [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !sessionStorage.getItem('komvo_sidebar_cache');
  });
  const [openSections, setOpenSections] = useState<{ restaurantes: boolean; packs: boolean }>({
    restaurantes: true,
    packs: true,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSections, setMobileSections] = useState<{ restaurantes: boolean; packs: boolean }>({
    restaurantes: false,
    packs: true,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [chatUnreadTotal, setChatUnreadTotal] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const restaurantesGlobal = useRestaurantes();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCollapsed = localStorage.getItem('komvo_sidebar_collapsed');
      if (storedCollapsed) {
        setIsCollapsed(storedCollapsed === 'true');
      }
      const storedSections = localStorage.getItem('komvo_sidebar_sections');
      if (storedSections) {
        try {
          const parsed = JSON.parse(storedSections) as { restaurantes: boolean; packs: boolean };
          setOpenSections({ ...parsed, packs: true });
        } catch {
          // ignore malformed storage
        }
      } else {
        const defaults = { restaurantes: true, packs: true };
        setOpenSections(defaults);
        localStorage.setItem('komvo_sidebar_sections', JSON.stringify(defaults));
      }
    }

    let active = true;
    const CACHE_KEY = 'komvo_sidebar_cache';
    const CACHE_TTL_MS = 2 * 60 * 1000;

    const loadSidebarData = async () => {
      try {
        if (!sessionStorage.getItem(CACHE_KEY)) {
          setIsLoading(true);
        }
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) {
          if (active) router.push('/login');
          return;
        }

        if (typeof window !== 'undefined') {
          const cachedRaw = sessionStorage.getItem(CACHE_KEY);
          if (cachedRaw) {
            try {
              const cached = JSON.parse(cachedRaw) as {
                ts: number;
                userId: string;
                partner: Partner;
                packs: PackResumen[];
              };
              const ageMs = Date.now() - cached.ts;
              if (cached.userId === currentUser.uid && ageMs < CACHE_TTL_MS) {
                setPartner(cached.partner);
                setPacks(cached.packs);
                if (active) setIsLoading(false);
                return;
              }
            } catch {
              // ignore cache errors
            }
          }
        }

        const partnerData = await AuthService.getCurrentPartner();
        if (!partnerData || !active) return;

        setPartner(partnerData);

        const ownerId = partnerData.id;

        if (ownerId) {
          const packsData = await PacksService.getPacksByOwnerId(ownerId);
          if (!active) return;
          setPacks(packsData);
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(
                CACHE_KEY,
                JSON.stringify({
                  ts: Date.now(),
                  userId: ownerId,
                  partner: partnerData,
                  packs: packsData,
                })
              );
            } catch {
              // ignore cache errors
            }
          }
        } else {
          setRestaurantes([]);
          setPacks([]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (!user && active) {
        router.push('/login');
        return;
      }
      loadSidebarData();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (restaurantesGlobal.isLoading) return;
    setRestaurantes(restaurantesGlobal.restaurantes);
  }, [restaurantesGlobal.isLoading, restaurantesGlobal.restaurantes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('komvo_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('komvo_sidebar_sections', JSON.stringify(openSections));
  }, [openSections]);

  useEffect(() => {
    let inboxUnsubs: Array<() => void> = [];
    const partnerId = AuthService.getCurrentPartnerIdSync();
    if (!partnerId) return;
    const unsubChats = ChatsService.listenChatsHead({
      partnerId,
      limitCount: 50,
      onChange: (items) => {
        inboxUnsubs.forEach((fn) => fn());
        inboxUnsubs = [];
        const nextMap: Record<string, number> = {};
        items.forEach((chat) => {
          const unsub = ReservaDetalleService.listenChatInbox({
            chatId: chat.id,
            partnerId,
            onChange: (count) => {
              nextMap[chat.id] = count;
              setChatUnreadTotal(Object.values(nextMap).reduce((acc, val) => acc + Number(val || 0), 0));
            },
          });
          inboxUnsubs.push(unsub);
        });
      },
    });
    inboxUnsubs.push(unsubChats);
    return () => inboxUnsubs.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await AuthService.signOut();
    router.replace('/login');
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900">
      <div className="flex h-screen overflow-hidden lg:overflow-visible">
        <aside
          className={`hidden h-screen flex-col border-r border-slate-100 bg-white px-0 pt-0 pb-0 text-[11px] transition-all lg:flex ${
            isCollapsed ? 'w-18 items-center' : 'w-56'
          }`}
        >

          <nav
            className={`relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto no-scrollbar px-2 pt-4 pb-4 ${
              isCollapsed ? 'w-full items-center' : ''
            }`}
          >
            <div className="h-3 shrink-0" />
            {NAV_ITEMS.filter((item) => item.href === '/dashboard').map((item) => {
              const isActive = pathname === '/dashboard';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group rounded-xl px-1.5 py-1 text-[12px] font-medium transition ${
                    isActive
                      ? 'bg-[#7472fd]/10 text-[#3b3af2] ring-1 ring-[#7472fd]/20'
                      : 'text-slate-600 hover:bg-slate-100'
                  } ${isCollapsed ? 'w-12 h-12 flex items-center justify-center p-0' : ''}`}
                >
                  {isCollapsed ? (
                    <span
                      className={`relative flex h-7 w-7 items-center justify-center rounded-lg transition group-hover:text-slate-700 ${
                        isActive ? 'bg-slate-100 text-[#3b3af2]' : 'bg-transparent text-slate-500'
                      }`}
                    >
                      <Home className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
              );
            })}

            <div>
              <div
                className={`group flex h-7 items-center justify-between rounded-xl px-1.5 py-1 text-[12px] font-medium transition ${
                  pathname.startsWith('/dashboard/restaurantes')
                    ? 'bg-[#7472fd]/10 text-[#3b3af2] ring-1 ring-[#7472fd]/20'
                    : 'text-slate-600 hover:bg-slate-100'
                } ${isCollapsed ? 'w-12 h-12 items-center justify-center p-0' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/restaurantes')}
                  className={`flex h-full w-full items-center gap-2 text-left ${isCollapsed ? 'justify-center' : ''}`}
                >
                  {isCollapsed ? (
                    <span
                      className={`relative flex h-7 w-7 items-center justify-center rounded-lg transition group-hover:text-slate-700 ${
                        pathname.startsWith('/dashboard/restaurantes')
                          ? 'bg-slate-100 text-[#3b3af2]'
                          : 'bg-transparent text-slate-500'
                      }`}
                    >
                      <Store className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    'Restaurantes'
                  )}
                </button>
                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((prev) => ({ ...prev, restaurantes: !prev.restaurantes }))
                    }
                    className={`flex h-5 w-5 items-center justify-center rounded-lg transition ${
                      pathname.startsWith('/dashboard/restaurantes')
                        ? 'text-[#3b3af2]'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition ${openSections.restaurantes ? 'rotate-90' : ''}`}
                    />
                  </button>
                )}
              </div>
              {!isCollapsed && openSections.restaurantes && (
                    <div className="mt-2 space-y-1.5 pl-1">
                  {isLoading ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-1 py-0.5 text-[12px] text-slate-400">
                      Cargando restaurantes...
                    </div>
                  ) : restaurantes.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => router.push('/restaurantes/new')}
                      className="flex w-full items-center justify-between rounded-lg border border-dashed border-slate-200 px-1 py-0.5 text-[12px] text-slate-400 transition hover:border-[#7472fd]/40 hover:bg-[#7472fd]/5"
                    >
                      <span>{partner ? 'Sin restaurantes asignados' : 'Cargando restaurantes'}</span>
                      {partner && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7472fd] text-[12px] font-semibold text-white">
                          +
                        </span>
                      )}
                    </button>
                  ) : (
                    restaurantes.map((restaurante) => (
                      <button
                        key={restaurante.id}
                        type="button"
                        onClick={() => router.push(`/restaurantes/${restaurante.id}`)}
                        className="flex w-full items-center justify-between rounded-lg border border-transparent px-1 py-0.5 text-left text-[12px] text-slate-600 transition hover:border-[#7472fd]/30 hover:bg-[#7472fd]/5"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          <span className="min-w-0 flex-1 truncate">{toLabel(restaurante.nombreRestaurante)}</span>
                        </div>
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            !restaurante.stripeAccountId
                              ? 'bg-amber-400'
                              : restaurante.abierto
                              ? 'bg-emerald-400'
                              : 'bg-rose-400'
                          }`}
                        />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <div
                className={`group flex h-7 items-center justify-between rounded-xl px-1.5 py-1 text-[12px] font-medium transition ${
                  pathname.startsWith('/dashboard/packs')
                    ? 'bg-[#7472fd]/10 text-[#3b3af2] ring-1 ring-[#7472fd]/20'
                    : 'text-slate-600 hover:bg-slate-100'
                } ${isCollapsed ? 'w-12 h-12 items-center justify-center p-0' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/packs')}
                  className={`flex h-full w-full items-center gap-2 text-left ${isCollapsed ? 'justify-center' : ''}`}
                >
                  {isCollapsed ? (
                    <span
                      className={`relative flex h-7 w-7 items-center justify-center rounded-lg transition group-hover:text-slate-700 ${
                        pathname.startsWith('/dashboard/packs') ? 'bg-slate-100 text-[#3b3af2]' : 'bg-transparent text-slate-500'
                      }`}
                    >
                      <Package className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    'Planes'
                  )}
                </button>
                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={() => setOpenSections((prev) => ({ ...prev, packs: !prev.packs }))}
                    className={`flex h-5 w-5 items-center justify-center rounded-lg transition ${
                      pathname.startsWith('/dashboard/packs')
                        ? 'text-[#3b3af2]'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition ${openSections.packs ? 'rotate-90' : ''}`}
                    />
                  </button>
                )}
              </div>
              {!isCollapsed && openSections.packs && (
                    <div className="mt-2 space-y-1.5 pl-1">
                  {isLoading ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-1 py-0.5 text-[12px] text-slate-400">
                      Cargando packs...
                    </div>
                  ) : packs.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-1 py-0.5 text-[12px] text-slate-400">
                      {partner ? 'Sin planes cargados' : 'Cargando planes'}
                    </div>
                  ) : (
                    packs.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => router.push(`/packs/${pack.id}`)}
                        className="flex w-full items-center justify-between rounded-lg border border-transparent px-1 py-0.5 text-left text-[12px] text-slate-600 transition hover:border-[#7472fd]/30 hover:bg-[#7472fd]/5"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          <span className="min-w-0 flex-1 truncate">{toLabel(pack.nombre)}</span>
                        </div>
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            pack.activo ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {NAV_ITEMS.filter((item) => item.href !== '/dashboard').map((item) => {
              const isActive = pathname.startsWith(item.href);
              const icon = (() => {
                switch (item.href) {
                  case '/reservas':
                  case '/dashboard/reservas':
                    return <CalendarCheck className="h-3.5 w-3.5" />;
                  case '/chats':
                  case '/dashboard/chats':
                    return <MessagesSquare className="h-3.5 w-3.5" />;
                  case '/dashboard/equipo':
                    return <Users className="h-3.5 w-3.5" />;
                  case '/web':
                  case '/dashboard/web':
                    return <Globe className="h-3.5 w-3.5" />;
                  default:
                    return <Home className="h-3.5 w-3.5" />;
                }
              })();
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group rounded-xl px-1.5 py-1 text-[12px] font-medium transition ${
                    isActive
                      ? 'bg-[#7472fd]/10 text-[#3b3af2] ring-1 ring-[#7472fd]/20'
                      : 'text-slate-600 hover:bg-slate-100'
                  } ${isCollapsed ? 'w-12 h-12 flex items-center justify-center p-0' : ''}`}
                >
                  {isCollapsed ? (
                    <span
                      className={`relative flex h-7 w-7 items-center justify-center rounded-lg transition group-hover:text-slate-700 ${
                        isActive ? 'bg-slate-100 text-[#3b3af2]' : 'bg-transparent text-slate-500'
                      }`}
                    >
                      {icon}
                      {item.href === '/dashboard/chats' && chatUnreadTotal > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#7472fd] px-1 text-[9px] font-semibold text-white">
                          {chatUnreadTotal}
                        </span>
                      )}
                    </span>
                  ) : (
                    <div className="flex w-full items-center gap-2">
                      <span>{item.label}</span>
                      {item.href === '/dashboard/chats' && chatUnreadTotal > 0 && (
                        <span className="ml-auto rounded-full bg-[#7472fd] px-2 py-0.5 text-[9px] font-semibold text-white">
                          {chatUnreadTotal}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
            <div className="h-3 shrink-0" />
            <div className="pointer-events-none sticky bottom-0 z-10 h-9 bg-gradient-to-t from-white to-transparent" />
          </nav>

          <div
            className={`mt-auto w-full ${
              isCollapsed ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-2'
            }`}
          >
            <span className="h-px w-[calc(100%+1rem)] -translate-x-2 bg-slate-200/80" />
            <div
              className={`flex w-full flex-col gap-2 px-2 ${
                isCollapsed ? 'items-center' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setIsCollapsed((prev) => !prev)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 ${
                  isCollapsed ? '' : 'self-end'
                }`}
                aria-label={isCollapsed ? 'Expandir menú' : 'Encoger menú'}
              >
                <ChevronRight className={`h-3.5 w-3.5 transition ${isCollapsed ? '' : 'rotate-180'}`} />
              </button>
              <div
                ref={menuRef}
                className={`relative overflow-visible ${isCollapsed ? 'w-full flex items-center justify-center' : 'w-full'}`}
              >
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-2 rounded-full border border-slate-200 px-1.5 py-1 transition hover:border-[#7472fd]/40 hover:bg-[#7472fd]/5 ${
                    isCollapsed ? 'h-7 w-7 justify-center p-0' : 'w-full'
                  }`}
                >
                  <CircleUserRound className="h-3.5 w-3.5 text-slate-500" />
                  {!isCollapsed && (
                    <div className="text-left">
                      <p className="text-[12px] font-medium text-slate-800">
                        {(partner as unknown as Record<string, string>)?.['Nombre del negocio'] ||
                          partner?.nombreNegocio ||
                          'Partner'}
                      </p>
                      <p className="text-[12px] text-slate-400">
                        {(partner as unknown as Record<string, string>)?.Apellidos || partner?.apellidos || ''}
                      </p>
                    </div>
                  )}
                  {!isCollapsed && (
                    <span className="ml-auto">
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                  )}
                </button>
                {menuOpen && (
                  <div
                    className={`absolute z-30 rounded-xl border border-slate-100 bg-white p-2 shadow-lg ${
                      isCollapsed
                        ? 'left-1/2 top-12 w-48 -translate-x-1/2'
                        : 'left-0 bottom-12 w-full'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-xl px-1.5 py-1 text-[12px] text-slate-700 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Salir
                    </button>
                  </div>
                )}
              </div>
              <div className="h-3" />
            </div>
          </div>

          {/* Estado de integracion removido */}
        </aside>

        <div className="flex h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur lg:hidden">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-2">
                {!isMounted ? (
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled>
                    <Menu className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="icon" className="h-7 w-7">
                        <Menu className="h-3.5 w-3.5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 p-0">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Menú principal</SheetTitle>
                    </SheetHeader>
                    <div className="flex h-full flex-col bg-white px-4 py-8">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[12px] uppercase tracking-[0.2em] text-slate-400">Komvo</p>
                          <p className="text-lg font-semibold text-slate-900">Partners</p>
                        </div>
                      </div>

                      <nav className="mt-8 flex flex-1 flex-col gap-2 text-[12px]">
                        {NAV_ITEMS.filter((item) => item.href === '/dashboard').map((item) => {
                          const isActive = pathname === '/dashboard';
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`rounded-xl px-1.5 py-1 text-[11px] font-medium transition ${
                                isActive
                                  ? 'bg-[#7472fd]/10 text-[#3b3af2] ring-1 ring-[#7472fd]/20'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {item.label}
                            </Link>
                          );
                        })}

                        <div className="flex items-center justify-between rounded-xl px-1.5 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              router.push('/dashboard/restaurantes');
                            }}
                            className="flex flex-1 items-center gap-2 text-left text-[11px] font-medium text-slate-600"
                          >
                            Restaurantes
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMobileSections((prev) => ({ ...prev, restaurantes: !prev.restaurantes }))
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <ChevronRight
                              className={`h-3.5 w-3.5 transition ${
                                mobileSections.restaurantes ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                        </div>
                        {mobileSections.restaurantes && (
                          <div className="ml-2 space-y-2 pl-2">
                            {restaurantes.length === 0 ? (
                              <Link
                                href="/restaurantes/new"
                                className="block rounded-xl px-1.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                Crear restaurante
                              </Link>
                            ) : (
                              restaurantes.map((rest) => (
                                <Link
                                  key={rest.id}
                                  href={`/restaurantes/${rest.id}`}
                                  className="flex items-center justify-between rounded-xl px-1.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                                    <span className="min-w-0 flex-1 truncate">{toLabel(rest.nombreRestaurante)}</span>
                                  </div>
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full ${
                                      !rest.stripeAccountId
                                        ? 'bg-amber-400'
                                        : rest.abierto
                                        ? 'bg-emerald-400'
                                        : 'bg-rose-400'
                                    }`}
                                  />
                                </Link>
                              ))
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between rounded-xl px-1.5 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              router.push('/dashboard/packs');
                            }}
                            className="flex flex-1 items-center gap-2 text-left text-[11px] font-medium text-slate-600"
                          >
                            Planes
                          </button>
                          <button
                            type="button"
                            onClick={() => setMobileSections((prev) => ({ ...prev, packs: !prev.packs }))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <ChevronRight
                              className={`h-3.5 w-3.5 transition ${mobileSections.packs ? 'rotate-90' : ''}`}
                            />
                          </button>
                        </div>
                        {mobileSections.packs && (
                          <div className="ml-2 space-y-2 pl-2">
                            {packs.length === 0 ? (
                              <Link
                                href="/dashboard/packs"
                                className="block rounded-xl px-1.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                Ver packs
                              </Link>
                            ) : (
                              packs.map((pack) => (
                                <Link
                                  key={pack.id}
                                  href={`/packs/${pack.id}`}
                                  className="flex items-center justify-between rounded-xl px-1.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                                    <span className="min-w-0 flex-1 truncate">{toLabel(pack.nombre)}</span>
                                  </div>
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full ${
                                      pack.activo ? 'bg-emerald-400' : 'bg-rose-400'
                                    }`}
                                  />
                                </Link>
                              ))
                            )}
                          </div>
                        )}

                        {NAV_ITEMS.filter((item) => item.href !== '/dashboard').map((item) => {
                          const isActive = pathname.startsWith(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`rounded-xl px-1.5 py-1 text-[11px] font-medium transition ${
                                isActive
                                  ? 'bg-[#7472fd]/10 text-[#3b3af2] ring-1 ring-[#7472fd]/20'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                      </nav>
                    </div>
                    </SheetContent>
                  </Sheet>
                )}
              </div>
              <div className="flex items-center gap-2" />
            </div>
          </header>

          <main
            className={`flex-1 overflow-y-auto ${
              pathname.startsWith('/dashboard/restaurantes') ||
              pathname.startsWith('/dashboard/packs') ||
              pathname.startsWith('/dashboard/web') ||
              pathname.startsWith('/dashboard/reservas')
                ? 'px-0 py-0'
                : 'px-6 py-8'
            }`}
          >
            <div className="mx-auto w-full max-w-none h-full min-h-0">
              <DashboardDataProvider value={{ partner, restaurantes, packs, isLoading }}>
                {children}
              </DashboardDataProvider>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
