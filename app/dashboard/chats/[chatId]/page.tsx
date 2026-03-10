'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChatDocSchema, type ChatDoc } from '@/lib/validators/chat';
import { ReservaDetalleContent } from '@/components/reservations/reserva-detalle-content';

export default function ChatReservaPage() {
  const params = useParams();
  const chatId = typeof params?.chatId === 'string' ? params.chatId : '';
  const [reservaId, setReservaId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const snap = await getDoc(doc(db, 'chats', chatId));
      if (!active) return;
      if (!snap.exists()) {
        setReservaId('');
        setLoading(false);
        return;
      }
      const data = ChatDocSchema.parse(snap.data()) as ChatDoc;
      setReservaId(data.reservaId ?? '');
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [chatId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 text-sm text-slate-500">
        Cargando reserva...
      </div>
    );
  }

  if (!reservaId) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 text-sm text-slate-500">
        No se encontró la reserva asociada al chat.
      </div>
    );
  }

  return <ReservaDetalleContent reservaId={reservaId} variant="page" />;
}
