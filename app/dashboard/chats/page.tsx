'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Filter, Send } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AuthService } from '@/lib/services/auth.service';
import { ChatsService, type ChatItem } from '@/lib/services/chats.service';
import { ReservaDetalleService, type ChatMessageDetalle } from '@/lib/services/reserva-detalle.service';
import { useRestaurantes } from '@/components/shared/restaurantes-context';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { ReservaDetalleContent } from '@/components/reservations/reserva-detalle-content';

export default function ChatsPage() {
  const partnerId = AuthService.getCurrentPartnerIdSync() ?? '';
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<ChatMessageDetalle[]>([]);
  const [messageCursor, setMessageCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [messagesHasMore, setMessagesHasMore] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [latestMessageTs, setLatestMessageTs] = useState<Timestamp | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [filterActivo, setFilterActivo] = useState<'all' | 'active'>('active');
  const [restauranteFilter, setRestauranteFilter] = useState<string>('all');
  const [unreadByChat, setUnreadByChat] = useState<Record<string, number>>({});
  const [detailReservaId, setDetailReservaId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { restaurantes } = useRestaurantes();
  const listRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);
  const loadingMessagesRef = useRef(false);
  const suppressLoadMoreRef = useRef(false);

  useEffect(() => {
    loadingMessagesRef.current = loadingMessages;
  }, [loadingMessages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const mergeChats = useCallback((head: ChatItem[], tail: ChatItem[]) => {
    const map = new Map<string, ChatItem>();
    head.forEach((c) => map.set(c.id, c));
    tail.forEach((c) => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values()).sort((a, b) => {
      const aTime =
        a.lastMessageAt instanceof Date
          ? a.lastMessageAt.getTime()
          : typeof a.lastMessageAt === 'object' && a.lastMessageAt !== null && 'toDate' in a.lastMessageAt
          ? (a.lastMessageAt as { toDate: () => Date }).toDate().getTime()
          : new Date(a.lastMessageAt as string).getTime();
      const bTime =
        b.lastMessageAt instanceof Date
          ? b.lastMessageAt.getTime()
          : typeof b.lastMessageAt === 'object' && b.lastMessageAt !== null && 'toDate' in b.lastMessageAt
          ? (b.lastMessageAt as { toDate: () => Date }).toDate().getTime()
          : new Date(b.lastMessageAt as string).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
  }, []);

  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    const unsubscribe = ChatsService.listenChatsHead({
      partnerId,
      limitCount: 8,
      onlyActive: filterActivo === 'active',
      restauranteId: restauranteFilter !== 'all' ? restauranteFilter : null,
      onChange: (head) => {
        setChats((prev) => mergeChats(head, prev));
        setLoading(false);
      },
    });
    return () => unsubscribe();
  }, [partnerId, mergeChats, activeChatId, filterActivo, restauranteFilter, isMobile]);

  const loadMore = useCallback(async () => {
    if (!partnerId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const page = await ChatsService.getChatsPage({
      partnerId,
      pageSize: 8,
      cursor,
      onlyActive: filterActivo === 'active',
      restauranteId: restauranteFilter !== 'all' ? restauranteFilter : null,
    });
    setCursor(page.cursor);
    setHasMore(page.hasMore);
    setChats((prev) => mergeChats(prev, page.chats));
    setLoadingMore(false);
  }, [partnerId, loadingMore, hasMore, cursor, mergeChats, filterActivo, restauranteFilter]);

  useEffect(() => {
    setChats([]);
    setCursor(null);
    setHasMore(true);
    setActiveChatId(null);
    setActiveChat(null);
    setLatestMessageTs(null);
  }, [filterActivo, restauranteFilter]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const list = listRef.current ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        const container = listRef.current;
        const canScroll = container && container.scrollHeight > container.clientHeight + 4;
        if (!canScroll) return;
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root: list ?? undefined }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    if (!partnerId || chats.length === 0) return;
    const listeners: Array<() => void> = [];
    chats.slice(0, 50).forEach((chat) => {
      const unsub = ReservaDetalleService.listenChatInbox({
        chatId: chat.id,
        partnerId,
        onChange: (count) => {
          setUnreadByChat((prev) => ({ ...prev, [chat.id]: count }));
        },
      });
      listeners.push(unsub);
    });
    return () => listeners.forEach((fn) => fn());
  }, [partnerId, chats]);

  useEffect(() => {
    if (!activeChatId) return;
    const chat = chats.find((item) => item.id === activeChatId) ?? null;
    setActiveChat(chat);
    setMessages([]);
    setMessageCursor(null);
    setMessagesHasMore(true);
    setLatestMessageTs(null);
    if (partnerId) {
      void ReservaDetalleService.clearChatUnread({ chatId: activeChatId, partnerId });
    }
    let active = true;
    const loadInitial = async () => {
      setLoadingMessages(true);
      const result = await ReservaDetalleService.getChatMensajesPage({
        chatId: activeChatId,
        pageSize: 15,
        cursor: null,
      });
      if (!active) {
        setLoadingMessages(false);
        return;
      }
      setMessages(result.mensajes);
      setMessageCursor(result.cursor);
      setMessagesHasMore(result.hasMore);
      const lastMsg = result.mensajes[result.mensajes.length - 1];
      if (lastMsg?.timestamp instanceof Timestamp) {
        setLatestMessageTs(lastMsg.timestamp);
      } else {
        setLatestMessageTs(null);
      }
      setLoadingMessages(false);
      requestAnimationFrame(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
          isAtBottomRef.current = true;
        }
      });
    };
    void loadInitial();
    return () => {
      active = false;
    };
  }, [activeChatId, chats, partnerId]);

  useEffect(() => {
    if (!activeChatId || !latestMessageTs) return;
    const unsubscribe = ReservaDetalleService.listenMensajes(
      activeChatId,
      (msgs) => {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...msgs.filter((m) => !seen.has(m.id))];
        });
        if (msgs.length) {
          const last = msgs[msgs.length - 1];
          if (last.timestamp instanceof Timestamp) {
            setLatestMessageTs(last.timestamp);
          }
        }
        requestAnimationFrame(() => {
          const container = messagesRef.current;
          if (!container) return;
          const atBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight < 40;
          isAtBottomRef.current = atBottom;
          if (atBottom) {
            container.scrollTop = container.scrollHeight;
          }
        });
      },
      { since: latestMessageTs }
    );
    return () => unsubscribe();
  }, [activeChatId, latestMessageTs]);

  const loadMoreMessages = useCallback(async () => {
    if (!activeChatId || !messagesHasMore || loadingMessages) return;
    const container = messagesRef.current;
    const prevHeight = container?.scrollHeight ?? 0;
    const prevTop = container?.scrollTop ?? 0;
    suppressLoadMoreRef.current = true;
    setLoadingMessages(true);
    const result = await ReservaDetalleService.getChatMensajesPage({
      chatId: activeChatId,
      pageSize: 15,
      cursor: messageCursor,
    });
    setMessageCursor(result.cursor);
    setMessagesHasMore(result.hasMore);
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const uniqueOlder = result.mensajes.filter((m) => !seen.has(m.id));
      return [...uniqueOlder, ...prev];
    });
    setLoadingMessages(false);
    requestAnimationFrame(() => {
      if (!container) {
        suppressLoadMoreRef.current = false;
        return;
      }
      const newHeight = container.scrollHeight;
      container.scrollTop = newHeight - prevHeight + prevTop;
      suppressLoadMoreRef.current = false;
    });
  }, [activeChatId, messageCursor, messagesHasMore, loadingMessages]);

  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      if (filterActivo === 'active' && chat.activo === false) return false;
      if (restauranteFilter !== 'all' && chat.restauranteId !== restauranteFilter) return false;
      return true;
    });
  }, [chats, filterActivo, restauranteFilter]);

  const totalUnread = useMemo(
    () => Object.values(unreadByChat).reduce((acc, val) => acc + Number(val || 0), 0),
    [unreadByChat]
  );

  const handleSend = async () => {
    if (!activeChatId || !message.trim()) return;
    setSending(true);
    try {
      await ReservaDetalleService.enviarMensaje({ chatId: activeChatId, content: message.trim() });
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (value?: unknown) => {
    if (!value) return '';
    const date =
      value instanceof Date
        ? value
        : typeof value === 'object' && value !== null && 'toDate' in (value as Record<string, unknown>)
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value as string);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, 'dd MMM · HH:mm', { locale: es });
  };

  const getClienteNombre = (chat?: ChatItem | null) => {
    if (!chat) return 'Cliente';
    const nombre = (chat.nombreChat ?? '').trim();
    if (!nombre) return 'Cliente';
    const parts = nombre.split(' - ');
    return parts.length > 1 ? parts[parts.length - 1].trim() || nombre : nombre;
  };

  const getRestauranteNombre = (chat?: ChatItem | null) => {
    if (!chat) return 'Restaurante';
    const raw = chat.nombreRestaurante;
    return typeof raw === 'string' && raw.trim() ? raw : 'Restaurante';
  };

  return (
    <div className="min-h-screen bg-slate-50 px-0 py-0 lg:px-4 lg:py-4">
      <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-0 py-0 lg:px-0 lg:py-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Chats</p>
            <h1 className="text-2xl font-semibold text-slate-900">Conversaciones</h1>
          </div>
          {totalUnread > 0 && (
            <span className="rounded-full bg-[#7472fd] px-3 py-1 text-xs font-semibold text-white">
              {totalUnread} sin leer
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Estado</span>
            <select
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              value={filterActivo}
              onChange={(event) => setFilterActivo(event.target.value as 'all' | 'active')}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            <span className="text-slate-400">Restaurante</span>
            <select
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              value={restauranteFilter}
              onChange={(event) => setRestauranteFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {restaurantes.map((rest) => (
                <option key={rest.id} value={rest.id}>
                  {rest.nombreRestaurante || 'Restaurante'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 px-0 lg:px-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card
            className="flex flex-col border-none bg-white shadow-sm rounded-none lg:rounded-2xl lg:border lg:border-slate-200"
          >
            <CardHeader className="pb-2 px-4 lg:px-6">
              <CardTitle className="text-base text-slate-900">Chats</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 lg:px-3 lg:pb-3 w-full">
              <div
                ref={listRef}
                className="max-h-[calc(100vh-220px)] overflow-y-auto space-y-0 px-0 pb-3 lg:px-0 lg:pb-0 w-full lg:space-y-2"
              >
                {loading && <p className="text-xs text-slate-500">Cargando chats...</p>}
                {!loading && filteredChats.length === 0 && (
                  <p className="text-xs text-slate-500">No hay chats con este filtro.</p>
                )}
                {filteredChats.map((chat) => {
                  const selected = chat.id === activeChatId;
                  const lastMessage = (chat.ultimoMensaje as { content?: string } | undefined)?.content || '';
                  const unread = unreadByChat[chat.id] ?? 0;
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => setActiveChatId(chat.id)}
                      className={`w-full rounded-none lg:rounded-xl border border-x-0 lg:border-x border-slate-200 px-4 py-3 text-left transition ${
                        selected
                          ? 'lg:border-[#7472fd] bg-[#7472fd]/10'
                          : 'hover:lg:border-[#7472fd]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{getClienteNombre(chat)}</p>
                          <p className="text-[11px] text-slate-500">{getRestauranteNombre(chat)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {unread > 0 && (
                            <span className="rounded-full bg-[#7472fd] px-2 py-0.5 text-[10px] font-semibold text-white">
                              {unread}
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold ${chat.activo === false ? 'text-slate-400' : 'text-emerald-600'}`}>
                            {chat.activo === false ? 'Inactivo' : 'Activo'}
                          </span>
                        </div>
                      </div>
                      {lastMessage && (
                        <p className="mt-2 text-[11px] text-slate-600 line-clamp-1">{lastMessage}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] text-slate-400">{formatDate(chat.lastMessageAt)}</p>
                        <Link
                          href="#"
                          className="text-[10px] font-semibold text-[#3b3af2] hover:underline"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (chat.reservaId) {
                              setDetailReservaId(chat.reservaId);
                            }
                          }}
                        >
                          Ver reserva
                        </Link>
                      </div>
                    </button>
                  );
                })}
                {hasMore && <div ref={loaderRef} className="h-6" />}
                {loadingMore && <p className="text-[11px] text-slate-400">Cargando más...</p>}
              </div>
            </CardContent>
          </Card>

          {!isMobile && (
            <Card className="border-none bg-white shadow-sm flex flex-col lg:sticky lg:top-20 lg:h-[calc(100vh-160px)]">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base text-slate-900">
                  {activeChatId ? getClienteNombre(activeChat) : 'Selecciona un chat'}
                </CardTitle>
                <p className="text-xs text-slate-500">{getRestauranteNombre(activeChat)}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-0 min-h-0">
                {!activeChatId ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                    Selecciona un chat para ver los mensajes.
                  </div>
                ) : (
                  <>
                    <div
                      ref={messagesRef}
                      className="flex-1 overflow-y-auto p-4 space-y-2"
                      onScroll={(event) => {
                        const target = event.currentTarget;
                        if (
                          target.scrollTop < 80 &&
                          !loadingMessagesRef.current &&
                          !suppressLoadMoreRef.current
                        ) {
                          void loadMoreMessages();
                        }
                        const atBottom =
                          target.scrollHeight - target.scrollTop - target.clientHeight < 40;
                        isAtBottomRef.current = atBottom;
                      }}
                    >
                      {messages.length === 0 && (
                        <div className="text-xs text-slate-500">No hay mensajes aún.</div>
                      )}
                      {messages.map((msg) => {
                        const content = msg.content || msg.texto || msg.message || '';
                        const senderId = msg.sender?.id || msg.senderId || '';
                        const isPartner = senderId && partnerId === senderId;
                        return (
                          <div key={msg.id} className={`flex ${isPartner ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                                isPartner
                                  ? 'bg-[#7472fd] text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-slate-100 p-4">
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <Input
                          value={message}
                          placeholder="Escribe un mensaje..."
                          onChange={(event) => setMessage(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void handleSend();
                            }
                          }}
                          disabled={!activeChatId || sending}
                          className="border-none bg-transparent text-sm placeholder:text-slate-400 focus-visible:ring-0"
                        />
                        <Button
                          size="icon"
                          className="h-10 w-10 rounded-full bg-[#7472fd] text-white hover:bg-[#5b59f4]"
                          disabled={!activeChatId || !message.trim() || sending}
                          onClick={() => void handleSend()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {isMobile && activeChatId && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{getClienteNombre(activeChat)}</p>
                <p className="text-xs text-slate-500">{getRestauranteNombre(activeChat)}</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
                onClick={() => {
                  setActiveChatId(null);
                  setActiveChat(null);
                }}
              >
                ✕
              </button>
            </div>
            <div
              ref={messagesRef}
              className="flex-1 overflow-y-auto p-4 space-y-2"
              onScroll={(event) => {
                const target = event.currentTarget;
                if (
                  target.scrollTop < 80 &&
                  !loadingMessagesRef.current &&
                  !suppressLoadMoreRef.current
                ) {
                  void loadMoreMessages();
                }
                const atBottom =
                  target.scrollHeight - target.scrollTop - target.clientHeight < 40;
                isAtBottomRef.current = atBottom;
              }}
            >
              {messages.length === 0 && (
                <div className="text-xs text-slate-500">No hay mensajes aún.</div>
              )}
              {messages.map((msg) => {
                const content = msg.content || msg.texto || msg.message || '';
                const senderId = msg.sender?.id || msg.senderId || '';
                const isPartner = senderId && partnerId === senderId;
                return (
                  <div key={msg.id} className={`flex ${isPartner ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        isPartner ? 'bg-[#7472fd] text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {content}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 p-4">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <Input
                  value={message}
                  placeholder="Escribe un mensaje..."
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  disabled={!activeChatId || sending}
                  className="border-none bg-transparent text-sm placeholder:text-slate-400 focus-visible:ring-0"
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full bg-[#7472fd] text-white hover:bg-[#5b59f4]"
                  disabled={!activeChatId || !message.trim() || sending}
                  onClick={() => void handleSend()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Sheet
        modal={false}
        open={Boolean(detailReservaId)}
        onOpenChange={(open) => {
          if (!open) setDetailReservaId(null);
        }}
      >
        <SheetContent
          side="right"
          className="!right-0 !w-auto !max-w-none p-0 data-[state=open]:duration-0 data-[state=closed]:duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
          style={{ left: 0, right: 0, width: 'auto' }}
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Detalle de reserva</SheetTitle>
          <ReservaDetalleContent
            reservaId={detailReservaId}
            variant="panel"
            onClose={() => setDetailReservaId(null)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
