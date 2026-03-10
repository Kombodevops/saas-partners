import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PackDetalleDocSchema } from '@/lib/validators/pack-detalle';
import type { PackDetalleDoc } from '@/lib/validators/pack-detalle';

export interface PackDetalle extends PackDetalleDoc {
  id: string;
}

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return true;
};

export class PackDetalleService {
  static async getPacksByOwner(ownerId: string): Promise<PackDetalle[]> {
    if (!ownerId) return [];

    const ref = collection(db, 'packs');
    const snapshot = await getDocs(query(ref, where('idPropietario', '==', ownerId)));

    return snapshot.docs.map((doc) => {
      const parsed = PackDetalleDocSchema.parse(doc.data());
      return {
        id: doc.id,
        ...parsed,
        activo: parseBoolean(parsed.activo),
      };
    });
  }

  static async getPacksByRestaurante(ownerId: string, restauranteId: string): Promise<PackDetalle[]> {
    if (!ownerId || !restauranteId) return [];

    const ref = collection(db, 'packs');
    const snapshot = await getDocs(
      query(ref, where('idPropietario', '==', ownerId), where('restaurantesIds', 'array-contains', restauranteId))
    );

    return snapshot.docs.map((doc) => {
      const parsed = PackDetalleDocSchema.parse(doc.data());
      return {
        id: doc.id,
        ...parsed,
        activo: parseBoolean(parsed.activo),
      };
    });
  }
}
