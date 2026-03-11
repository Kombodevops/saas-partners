'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessagesSquare, Send, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthService } from '@/lib/services/auth.service';
import { ReservaDetalleService } from '@/lib/services/reserva-detalle.service';
import type { ChatMessageDetalle } from '@/lib/services/reserva-detalle.service';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

type Props = {
  unreadCount?: number;
  chatNombre?: string;
  chatId?: string | null;
  reservaId?: string | null;
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  restauranteId?: string | null;
  nombreRestaurante?: string | null;
  responsableNombre?: string | null;
  onSent?: () => void;
};

export const ChatCard = memo(function ChatCard({
  unreadCount = 0,
  chatNombre,
  chatId,
  reservaId,
  usuarioId,
  usuarioNombre,
  restauranteId,
  nombreRestaurante,
  responsableNombre,
  onSent,
}: Props) {
  const [liveUnread, setLiveUnread] = useState(unreadCount);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeLeaving, setNudgeLeaving] = useState(false);
  const [showNoUserNudge, setShowNoUserNudge] = useState(false);
  const [suppressChat, setSuppressChat] = useState(false);

  const partnerId = AuthService.getCurrentPartnerIdSync() ?? '';
  const partnerName =
    responsableNombre?.trim() ||
    nombreRestaurante?.trim() ||
    AuthService.getCurrentUser()?.displayName ||
    'Restaurante';
  const [activeChatId, setActiveChatId] = useState<string | null>(chatId ?? null);
  const [messages, setMessages] = useState<ChatMessageDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMessages([]);
    setCursor(null);
    setHasMore(true);
    setInitialLoaded(false);
    setActiveChatId(chatId ?? null);
  }, [chatId]);

  useEffect(() => {
    setLiveUnread(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (partnerId && activeChatId) {
      const unsub = ReservaDetalleService.listenChatInbox({
        chatId: activeChatId,
        partnerId,
        onChange: setLiveUnread,
      });
      return () => unsub();
    }
  }, [partnerId, activeChatId]);

  useEffect(() => {
    if (liveUnread > 0 && !open) {
      setShowNudge(true);
      setNudgeLeaving(false);
      const timer = window.setTimeout(() => {
        setNudgeLeaving(true);
        window.setTimeout(() => setShowNudge(false), 200);
      }, 6000);
      return () => window.clearTimeout(timer);
    }
    setShowNudge(false);
    setNudgeLeaving(false);
  }, [liveUnread, open]);

  useEffect(() => {
    if (!showNoUserNudge) return;
    const timer = window.setTimeout(() => setShowNoUserNudge(false), 6000);
    return () => window.clearTimeout(timer);
  }, [showNoUserNudge]);

  useEffect(() => {
    if (!mounted) return;
    const checkDialogs = () => {
      const hasDialog =
        document.querySelector('[data-slot="dialog-overlay"][data-state="open"]') ??
        document.querySelector('[data-slot="dialog-content"][data-state="open"]') ??
        document.querySelector('[role="dialog"][data-state="open"][aria-modal="true"]') ??
        document.querySelector('[data-komvo-modal="true"]');
      setSuppressChat(Boolean(hasDialog));
    };
    checkDialogs();
    const observer = new MutationObserver(checkDialogs);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, [mounted]);

  const loadPage = async (mode: 'initial' | 'more') => {
    if (!chatId || loading) return;
    setLoading(true);
    const prevScrollHeight = listRef.current?.scrollHeight ?? 0;

    const result = await ReservaDetalleService.getChatMensajesPage({
      chatId,
      pageSize: 20,
      cursor: mode === 'more' ? cursor : null,
    });

    setCursor(result.cursor);
    setHasMore(result.hasMore);

    if (mode === 'initial') {
      setMessages((prev) => {
        if (prev.length === 0) return result.mensajes;
        const seen = new Set(result.mensajes.map((m) => m.id));
        return [...result.mensajes, ...prev.filter((m) => !seen.has(m.id))];
      });
      setInitialLoaded(true);
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      });
    } else {
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const uniqueOlder = result.mensajes.filter((m) => !seen.has(m.id));
        return [...uniqueOlder, ...prev];
      });
      requestAnimationFrame(() => {
        if (listRef.current) {
          const nextScrollHeight = listRef.current.scrollHeight;
          listRef.current.scrollTop = nextScrollHeight - prevScrollHeight;
        }
      });
    }

    setLoading(false);
  };

  const refreshLatest = async () => {
    setMessages([]);
    setCursor(null);
    setHasMore(true);
    setInitialLoaded(false);
    await loadPage('initial');
  };

  useEffect(() => {
    if (!open || !activeChatId) return;
    if (partnerId) {
      void ReservaDetalleService.clearChatUnread({ chatId: activeChatId, partnerId });
    }
    setLoading(true);
    const unsubscribe = ReservaDetalleService.listenMensajes(activeChatId, (newMessages) => {
      setMessages((prev) => {
        const seen = new Set(newMessages.map((m) => m.id));
        return [...newMessages, ...prev.filter((m) => !seen.has(m.id))];
      });
      setLoading(false);
      requestAnimationFrame(() => {
        if (!listRef.current) return;
        if (atBottom || !initialLoaded) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
          setInitialLoaded(true);
        }
      });
    });
    return () => unsubscribe();
  }, [open, activeChatId, atBottom, initialLoaded, partnerId]);

  const handleToggle = () => {
    setAnimating(true);
    setOpen((prev) => {
      const next = !prev;
      if (!next && partnerId && activeChatId) {
        void ReservaDetalleService.clearChatUnread({ chatId: activeChatId, partnerId });
      }
      return next;
    });
    window.setTimeout(() => setAnimating(false), 260);
  };

  const sendMessage = useCallback(async () => {
    if (!activeChatId || !message.trim() || sending) return;
    const textToSend = message.trim();
    setSending(true);
    setMessage('');
    try {
      await ReservaDetalleService.enviarMensaje({ chatId: activeChatId, content: textToSend });
      onSent?.();
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      setSending(false);
    }
  }, [activeChatId, message, sending, onSent]);

  const ensureChatExists = useCallback(async () => {
    if (activeChatId || !reservaId || !usuarioId || !partnerId) return activeChatId ?? null;
    const newChatId = await ReservaDetalleService.createChatForReserva({
      reservaId,
      restauranteId,
      nombreRestaurante,
      partnerId,
      partnerNombre: partnerName,
      usuarioId,
      usuarioNombre: usuarioNombre ?? null,
    });
    setActiveChatId(newChatId);
    setMessages([]);
    setCursor(null);
    setHasMore(true);
    setInitialLoaded(false);
    return newChatId;
  }, [activeChatId, reservaId, usuarioId, partnerId, restauranteId, nombreRestaurante, partnerName, usuarioNombre]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const distanceFromBottom = target.scrollHeight - (target.scrollTop + target.clientHeight);
      setAtBottom(distanceFromBottom < 120);
      if (target.scrollTop < 100 && hasMore && !loading) {
        void loadPage('more');
      }
    },
    [hasMore, loading]
  );

  const renderedMessages = useMemo(
    () =>
      messages.map((mensaje) => {
        const texto = mensaje.content || mensaje.texto || mensaje.message || 'Mensaje sin contenido';
        const senderId = mensaje.sender?.id || mensaje.senderId || '';
        const isPartner = partnerId && senderId === partnerId;
        return (
          <div key={mensaje.id} className={`flex ${isPartner ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`w-fit max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${
                isPartner ? 'bg-[#7472fd] text-white' : 'bg-white text-slate-700'
              }`}
            >
              {texto}
            </div>
          </div>
        );
      }),
    [messages, partnerId]
  );

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed bottom-16 right-16 z-[60] flex flex-col-reverse items-end gap-3 pointer-events-none sm:z-[10000] sm:flex-col ${
        suppressChat ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div
        className={`pointer-events-auto fixed inset-0 sm:absolute sm:inset-auto sm:right-0 sm:bottom-[calc(64px+12px)] sm:w-[520px] sm:h-[560px] transition-all duration-300 origin-bottom-right ${
          open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        } ${animating ? 'origin-bottom-right' : ''}`}
      >
        {open && (
          <Card className="border-none bg-slate-50 shadow-[0_28px_80px_rgba(15,23,42,0.24)] overflow-hidden pointer-events-auto w-full h-full rounded-none sm:rounded-xl py-0 gap-0">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#4b49f6] via-[#6a68ff] to-[#8a88ff] px-5 py-4 text-white rounded-none">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                  {chatNombre?.[0]?.toUpperCase() || 'C'}
                </div>
                <div>
                  <CardTitle className="text-lg text-white">{chatNombre || 'Conversación'}</CardTitle>
                  <p className="text-xs text-white/80">Activo ahora</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/30 p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
                onClick={handleToggle}
                aria-label="Cerrar chat"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="flex flex-1 min-h-0 flex-col bg-slate-50 p-0 pointer-events-auto overflow-hidden">
              <div
                ref={listRef}
                className="flex-1 min-h-0 overflow-y-auto bg-slate-50 p-4"
                onScroll={handleScroll}
              >
                <div className="flex min-h-full flex-col justify-end space-y-2">
                  {messages.length === 0 && !loading ? (
                    <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                      No hay mensajes recientes.
                    </div>
                  ) : (
                    renderedMessages
                  )}
                  {loading && (
                    <div className="text-center text-[11px] text-slate-400 py-2">Cargando mensajes…</div>
                  )}
                </div>
              </div>
              <div className="border-t border-slate-100 bg-white p-4">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  <Input
                    value={message}
                    placeholder="Escribe un mensaje..."
                    onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  disabled={sending}
                  className="border-none bg-transparent text-sm placeholder:text-slate-400 focus-visible:ring-0"
                  ref={inputRef}
                />
                <Button
                  className="h-10 w-10 rounded-full bg-[#7472fd] text-white hover:bg-[#5b59f4]"
                  size="icon"
                  disabled={!activeChatId || !message.trim() || sending}
                  onClick={() => void sendMessage()}
                >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="relative pointer-events-auto">
      <button
        type="button"
        className={`relative flex h-16 w-16 items-center justify-center rounded-full text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.22)] transition-all duration-300 hover:scale-105 active:scale-95 ${
          open ? 'bg-slate-300' : 'bg-slate-200'
        } ${open ? 'opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto' : 'opacity-100'}`}
        onClick={async () => {
          if (open) {
            handleToggle();
            return;
          }
          if (!activeChatId && !usuarioId) {
            setShowNoUserNudge(true);
            return;
          }
          const createdChatId = await ensureChatExists();
          if (createdChatId) {
            setActiveChatId(createdChatId);
          }
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        aria-label="Abrir chat"
        title="Abrir chat"
      >
        {open ? <X className="h-7 w-7" /> : <MessagesSquare className="h-7 w-7" />}
        {liveUnread > 0 && !open && (
          <span className="absolute -top-1 -right-1 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#7472fd] px-1 text-[11px] font-semibold text-white shadow-sm">
            {liveUnread}
          </span>
        )}
      </button>
        {showNudge && !suppressChat && (
          <div
            className={`absolute bottom-20 right-0 z-[46] w-72 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition-all duration-200 ${
              nudgeLeaving ? 'opacity-0 translate-y-1 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'
            }`}
          >
            Tienes {liveUnread} mensajes sin leer.
            <span className="absolute -bottom-1 right-6 h-2.5 w-2.5 rotate-45 bg-white border-b border-r border-slate-200" />
          </div>
        )}
        {showNoUserNudge && !suppressChat && (
          <div className="absolute bottom-20 right-0 z-[46] w-72 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-[0_12px_30px_rgba(15,23,42,0.12)] animate-[bubble-in_250ms_ease-out]">
            No hay usuario asignado a la reserva. El cliente debe confirmar la reserva para darse de alta en Komvo.
            <span className="absolute -bottom-1 right-6 h-2.5 w-2.5 rotate-45 bg-amber-50 border-b border-r border-amber-200" />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});
