import {
  addDoc,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PackDetalleDocSchema } from '@/lib/validators/pack-detalle';
import type { PackDetalleDoc } from '@/lib/validators/pack-detalle';
import type { PackEditForm } from '@/lib/validators/pack-edit';

export interface PackEdit extends PackDetalleDoc {
  id: string;
}

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return true;
};

export class PackEditService {
  private static collectRestaurantIdsFromItem(item: Record<string, unknown> | null | undefined): string[] {
    if (!item) return [];
    const ids = new Set<string>();
    const direct = item.restaurantesIds;
    if (Array.isArray(direct)) {
      direct.forEach((id) => {
        if (typeof id === 'string' && id) ids.add(id);
      });
    }
    const disponibilidad = item.disponibilidadPorRestaurante;
    if (Array.isArray(disponibilidad)) {
      disponibilidad.forEach((entry) => {
        const restId = (entry as { restauranteId?: unknown })?.restauranteId;
        if (typeof restId === 'string' && restId) ids.add(restId);
      });
    }
    return Array.from(ids);
  }

  private static collectRestaurantIdsFromPayload(payload: Partial<PackEditForm> | Record<string, unknown>) {
    const menus = Array.isArray(payload.Menus) ? (payload.Menus as Record<string, unknown>[]) : [];
    const tickets = Array.isArray(payload.Tickets) ? (payload.Tickets as Record<string, unknown>[]) : [];
    const barras = Array.isArray(payload['Barra Libre'])
      ? (payload['Barra Libre'] as Record<string, unknown>[])
      : [];
    const ids = new Set<string>();
    const topLevel = payload.restaurantesIds;
    if (Array.isArray(topLevel)) {
      topLevel.forEach((id) => {
        if (typeof id === 'string' && id) ids.add(id);
      });
    }
    menus.forEach((item) => {
      this.collectRestaurantIdsFromItem(item).forEach((id) => ids.add(id));
    });
    tickets.forEach((item) => {
      this.collectRestaurantIdsFromItem(item).forEach((id) => ids.add(id));
    });
    barras.forEach((item) => {
      this.collectRestaurantIdsFromItem(item).forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }

  private static async syncPlansIncludedForRestaurants(ownerId: string, restaurantIds: string[]) {
    if (!ownerId || restaurantIds.length === 0) return;
    const packsSnap = await getDocs(query(collection(db, 'packs'), where('idPropietario', '==', ownerId)));
    const chunks = [];
    for (let i = 0; i < restaurantIds.length; i += 10) {
      chunks.push(restaurantIds.slice(i, i + 10));
    }

    const menuIds = new Set<string>();
    const ticketIds = new Set<string>();
    const barraIds = new Set<string>();

    packsSnap.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const categoria = typeof data.Categoria === 'string' ? data.Categoria : '';
      const subcategoria = typeof data.Subcategoria === 'string' ? data.Subcategoria : '';
      const topLevelIds = Array.isArray(data.restaurantesIds)
        ? (data.restaurantesIds as unknown[]).filter(
            (id): id is string => typeof id === 'string' && id.length > 0
          )
        : [];
      const menus = Array.isArray(data.Menus) ? (data.Menus as Record<string, unknown>[]) : [];
      const tickets = Array.isArray(data.Tickets) ? (data.Tickets as Record<string, unknown>[]) : [];
      const barras = Array.isArray(data['Barra Libre'])
        ? (data['Barra Libre'] as Record<string, unknown>[])
        : [];

      menus.forEach((item) => {
        this.collectRestaurantIdsFromItem(item).forEach((id) => menuIds.add(id));
      });
      tickets.forEach((item) => {
        this.collectRestaurantIdsFromItem(item).forEach((id) => ticketIds.add(id));
      });
      barras.forEach((item) => {
        this.collectRestaurantIdsFromItem(item).forEach((id) => barraIds.add(id));
      });
      if (categoria === 'Menú') {
        topLevelIds.forEach((id) => menuIds.add(id));
      }
      if (categoria === 'Tickets') {
        topLevelIds.forEach((id) => ticketIds.add(id));
      }
      if (subcategoria === 'Barra Libre') {
        topLevelIds.forEach((id) => barraIds.add(id));
      }
    });

    for (const chunk of chunks) {
      const restaurantesSnap = await getDocs(
        query(collection(db, 'restaurants'), where(documentId(), 'in', chunk))
      );
      const batch = writeBatch(db);
      let pending = 0;
      restaurantesSnap.forEach((docSnap) => {
        const data = docSnap.data() as { plans_included?: unknown };
        const current = Array.isArray(data.plans_included)
          ? (data.plans_included as unknown[]).filter((val): val is string => typeof val === 'string')
          : [];
        const base = current.filter((item) => !['menu', 'ticket', 'barra_libre'].includes(item));
        if (menuIds.has(docSnap.id)) base.push('menu');
        if (ticketIds.has(docSnap.id)) base.push('ticket');
        if (barraIds.has(docSnap.id)) base.push('barra_libre');

        const next = Array.from(new Set(base));
        const hasChanges =
          next.length !== current.length || next.some((item) => !current.includes(item));
        if (hasChanges) {
          batch.update(docSnap.ref, { plans_included: next });
          pending += 1;
        }
      });
      if (pending > 0) {
        await batch.commit();
      }
    }
  }

  static async getPackById(id: string): Promise<PackEdit | null> {
    if (!id) return null;
    const ref = doc(db, 'packs', id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    const parsed = PackDetalleDocSchema.parse(snapshot.data());
    return {
      id: snapshot.id,
      ...parsed,
      activo: parseBoolean(parsed.activo),
    };
  }

  static async updatePack(id: string, payload: PackEditForm): Promise<void> {
    if (!id) return;
    const ref = doc(db, 'packs', id);
    const prevSnap = await getDoc(ref);
    const prevData = prevSnap.exists() ? (prevSnap.data() as Record<string, unknown>) : null;
    await updateDoc(ref, {
      'Nombre del pack': payload['Nombre del pack'],
      'Descripción': payload['Descripción'],
      Precio: payload.Precio ?? 0,
      activo: payload.activo ?? true,
      Categoria: payload.Categoria ?? '',
      Subcategoria: payload.Subcategoria ?? '',
      tipoPlan: payload.tipoPlan ?? [],
      restaurantesIds: payload.restaurantesIds ?? [],
      restaurantesPermiteComida: payload.restaurantesPermiteComida ?? [],
      Menus: payload.Menus ?? [],
      Tickets: payload.Tickets ?? [],
      'Barra Libre': payload['Barra Libre'] ?? [],
    });
    let ownerId = (prevData as { idPropietario?: string } | null)?.idPropietario ?? '';
    if (!ownerId) {
      ownerId = (payload as { idPropietario?: string } | null)?.idPropietario ?? '';
    }
    const affected = new Set<string>();
    if (prevData) {
      this.collectRestaurantIdsFromPayload(prevData).forEach((id) => affected.add(id));
    }
    this.collectRestaurantIdsFromPayload(payload).forEach((id) => affected.add(id));
    if (ownerId && affected.size > 0) {
      await this.syncPlansIncludedForRestaurants(ownerId, Array.from(affected));
    }
  }

  static async createPack(payload: {
    ownerId: string;
    categoria: 'Menú' | 'Tickets' | 'Best Deal';
    subcategoria?: 'Barra Libre' | null;
    nombre: string;
  }): Promise<string> {
    const packsRef = collection(db, 'packs');
    const docRef = await addDoc(packsRef, {
      'Nombre del pack': payload.nombre,
      'Descripción': '',
      Precio: 0,
      activo: true,
      Categoria: payload.categoria,
      Subcategoria: payload.subcategoria ?? null,
      tipoPlan: [],
      restaurantesIds: [],
      restaurantesPermiteComida: [],
      Menus: [],
      Tickets: [],
      'Barra Libre': [],
      idPropietario: payload.ownerId,
      prioridad: 10,
      slug: '',
      idRestaurante: null,
    });
    return docRef.id;
  }
}
