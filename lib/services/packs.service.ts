import {
  collection,
  getDocs,
  query,
  where,
  documentId,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { z } from 'zod';
import { PackDocSchema as PackDocSchemaImported } from '../validators/pack';
import { PackResumen } from '@/lib/types/pack';

const CHUNK_SIZE = 10;

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return true;
};

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const fallbackSchema = z
  .object({
    'Nombre del pack': z.string().catch(''),
    'Descripcion': z.string().optional(),
    'Descripción': z.string().optional(),
    Precio: z.union([z.number(), z.string()]).optional(),
    activo: z.union([z.boolean(), z.number(), z.string()]).optional(),
    Categoria: z.string().optional().catch(''),
    Subcategoria: z.string().optional().catch(''),
    tipoPlan: z.array(z.string()).optional().catch([]),
    restaurantesIds: z.array(z.string()).optional().catch([]),
  })
  .passthrough();

const PackSchema = PackDocSchemaImported ?? fallbackSchema;

const mapDocToResumen = (id: string, data: unknown): PackResumen => {
  const parsed = PackSchema.parse(data);
  const descripcion = parsed['Descripción'] ?? parsed['Descripcion'] ?? '';
  return {
    id,
    nombre: parsed['Nombre del pack'],
    descripcion,
    precio: parseNumber(parsed.Precio),
    activo: parseBoolean(parsed.activo),
    categoria: parsed.Categoria || undefined,
    subcategoria: parsed.Subcategoria || undefined,
  };
};

const chunkIds = (ids: string[]): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
};

const collectFromSnapshots = (snapshots: QuerySnapshot<DocumentData>[]): PackResumen[] => {
  const items: PackResumen[] = [];
  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      items.push(mapDocToResumen(doc.id, doc.data()));
    }
  }
  return items;
};

export class PacksService {
  static async getPacksByIds(ids: string[]): Promise<PackResumen[]> {
    if (ids.length === 0) return [];

    const packsRef = collection(db, 'packs');
    const chunks = chunkIds(ids);

    const snapshots = await Promise.all(
      chunks.map((chunk) => getDocs(query(packsRef, where(documentId(), 'in', chunk))))
    );

    const items = collectFromSnapshots(snapshots);
    const byId = new Map(items.map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter((item): item is PackResumen => Boolean(item));
  }

  static async getPacksByOwnerId(ownerId: string): Promise<PackResumen[]> {
    if (!ownerId) return [];

    const packsRef = collection(db, 'packs');
    const snapshot = await getDocs(query(packsRef, where('idPropietario', '==', ownerId)));
    return snapshot.docs.map((doc) => mapDocToResumen(doc.id, doc.data()));
  }
}
