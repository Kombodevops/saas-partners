import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
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
