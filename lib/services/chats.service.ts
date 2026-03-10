import {
  collection,
  getDocs,
  query,
  where,
  documentId,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChatDocSchema, type ChatDoc } from '@/lib/validators/chat';

const CHUNK_SIZE = 10;

const chunkIds = (ids: string[]): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
};

export type ChatItem = ChatDoc & { id: string };

export class ChatsService {
  static async getChatsPage(params: {
    partnerId: string;
    pageSize?: number;
    cursor?: QueryDocumentSnapshot | null;
    onlyActive?: boolean;
    restauranteId?: string | null;
  }): Promise<{ chats: ChatItem[]; cursor: QueryDocumentSnapshot | null; hasMore: boolean }> {
    const { partnerId, pageSize = 30, cursor, onlyActive = false, restauranteId } = params;
    if (!partnerId) return { chats: [], cursor: null, hasMore: false };
    const ref = collection(db, 'chats');
    const whereConstraints = [where('participants.partners.id', '==', partnerId)];
    if (onlyActive) whereConstraints.unshift(where('activo', '==', true));
    if (restauranteId) whereConstraints.unshift(where('restauranteId', '==', restauranteId));
    const base = query(ref, ...whereConstraints, orderBy('lastMessageAt', 'desc'), limit(pageSize));
    const snap = cursor
      ? await getDocs(
          query(ref, ...whereConstraints, orderBy('lastMessageAt', 'desc'), startAfter(cursor), limit(pageSize))
        )
      : await getDocs(base);
    const nextCursor = snap.docs[snap.docs.length - 1] ?? null;
    const chats = snap.docs.map((docSnap) => {
      const parsed = ChatDocSchema.parse(docSnap.data());
      return { id: docSnap.id, ...parsed };
    });
    return { chats, cursor: nextCursor, hasMore: Boolean(nextCursor) && chats.length === pageSize };
  }

  static listenChatsHead(params: {
    partnerId: string;
    limitCount?: number;
    onlyActive?: boolean;
    restauranteId?: string | null;
    onChange: (chats: ChatItem[]) => void;
  }) {
    const { partnerId, limitCount = 30, onlyActive = false, restauranteId, onChange } = params;
    if (!partnerId) return () => {};
    const ref = collection(db, 'chats');
    const constraints = [
      where('participants.partners.id', '==', partnerId),
      orderBy('lastMessageAt', 'desc'),
      limit(limitCount),
    ];
    if (onlyActive) constraints.unshift(where('activo', '==', true));
    if (restauranteId) constraints.unshift(where('restauranteId', '==', restauranteId));
    const q = query(ref, ...constraints);
    return onSnapshot(q, (snap) => {
      const chats = snap.docs.map((docSnap) => {
        const parsed = ChatDocSchema.parse(docSnap.data());
        return { id: docSnap.id, ...parsed };
      });
      onChange(chats);
    });
  }

  static async getChatsByPartnerId(partnerId: string): Promise<ChatItem[]> {
    if (!partnerId) return [];
    const ref = collection(db, 'chats');
    const snap = await getDocs(query(ref, where('participants.partners.id', '==', partnerId), orderBy('lastMessageAt', 'desc')));
    return snap.docs.map((docSnap) => {
      const parsed = ChatDocSchema.parse(docSnap.data());
      return { id: docSnap.id, ...parsed };
    });
  }

  static async getChatsByReservaIds(reservaIds: string[]): Promise<Record<string, ChatItem>> {
    if (reservaIds.length === 0) return {};

    const ref = collection(db, 'chats');
    const chunks = chunkIds(reservaIds);
    const results = await Promise.all(
      chunks.map((chunk) => getDocs(query(ref, where('reservaId', 'in', chunk))))
    );

    const map: Record<string, ChatItem> = {};
    for (const snap of results) {
      for (const doc of snap.docs) {
        const parsed = ChatDocSchema.parse(doc.data());
        if (parsed.reservaId) {
          map[parsed.reservaId] = { id: doc.id, ...parsed };
        }
      }
    }
    return map;
  }
}
