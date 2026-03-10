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
import { RestauranteDocSchema as RestauranteDocSchemaImported } from '../validators/restaurante';
import { RestauranteResumen } from '@/lib/types/restaurante';

const CHUNK_SIZE = 10;

const fallbackSchema = z
  .object({
    'Nombre del restaurante': z.string().catch(''),
    'Dirección': z.string().catch(''),
    'Ubicación': z.string().catch(''),
    'Tipo de cocina': z.string().optional().catch(''),
    'Logo del restaurante': z.array(z.string()).optional().catch([]),
    'Imagenes del restaurante': z.array(z.string()).optional().catch([]),
    abierto: z.boolean().optional().catch(false),
    Carta: z.record(z.string(), z.unknown()).optional().nullable(),
    raciones: z.array(z.unknown()).optional().catch([]),
    Raciones: z.array(z.unknown()).optional().catch([]),
    extras: z.array(z.unknown()).optional().catch([]),
    datos_personales: z
      .object({
        Email: z.string().optional().catch(''),
        Prefijo: z.string().optional().catch(''),
        'Número de teléfono': z.string().optional().catch(''),
        'Fecha de nacimiento': z.string().optional().catch(''),
        Dirección: z.string().optional().catch(''),
        Ciudad: z.string().optional().catch(''),
        CP: z.string().optional().catch(''),
        nombre: z.string().optional().catch(''),
        Apellidos: z.string().optional().catch(''),
      })
      .optional()
      .catch(undefined),
    datos_fiscales: z
      .object({
        isBusiness: z.boolean().optional().catch(false),
        'Razón social': z.string().optional().catch(''),
        NIF: z.string().optional().catch(''),
        'Dirección Fiscal': z.string().optional().catch(''),
        'Código Postal del negocio': z.string().optional().catch(''),
        'Ciudad del negocio': z.string().optional().catch(''),
        'Provincia del negocio': z.string().optional().catch(''),
        'Teléfono del negocio': z.string().optional().catch(''),
        contrato: z.string().optional().catch(''),
      })
      .optional()
      .catch(undefined),
    datos_bancarios: z
      .object({
        'Numero de cuenta': z.string().optional().catch(''),
        'Nombre y apellidos del titular de la cuenta': z.string().optional().catch(''),
        'Nombre del banco': z.string().optional().catch(''),
      })
      .optional()
      .catch(undefined),
    stripeAccountId: z.string().optional().catch(''),
    color: z.string().optional().catch(''),
  })
  .passthrough();

const RestauranteSchema = RestauranteDocSchemaImported ?? fallbackSchema;

const mapDocToResumen = (id: string, data: unknown): RestauranteResumen => {
  const parsed = RestauranteSchema.parse(data) as Record<string, unknown>;
  const cartaDisponible = parsed.Carta != null && Object.keys(parsed.Carta).length > 0;
  const imagenes = (parsed['Imagenes del restaurante'] as string[] | undefined) ?? [];
  const raciones =
    (parsed.raciones as unknown[] | undefined)?.length && (parsed.raciones as unknown[])
      ? (parsed.raciones as unknown[])
      : (parsed.Raciones as unknown[] | undefined) ?? [];
  const extras = (parsed.extras as unknown[] | undefined) ?? [];

  return {
    id,
    nombreRestaurante: String(parsed['Nombre del restaurante'] ?? ''),
    direccion: String(parsed['Dirección'] ?? ''),
    ubicacion: String(parsed['Ubicación'] ?? ''),
    tipoCocina: (parsed['Tipo de cocina'] as string | undefined) || undefined,
    logoRestaurante: (parsed['Logo del restaurante'] as string[] | undefined) ?? [],
    abierto: Boolean(parsed.abierto ?? false),
    cartaDisponible,
    tieneRaciones: (raciones ?? []).length > 0,
    tieneExtras: extras.length > 0,
    tieneMasDeUnaImagen: imagenes.length > 1,
    stripeAccountId: typeof parsed.stripeAccountId === 'string' ? parsed.stripeAccountId : '',
    color: typeof parsed.color === 'string' ? parsed.color : '',
  };
};

const chunkIds = (ids: string[]): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
};

const collectFromSnapshots = (snapshots: QuerySnapshot<DocumentData>[]): RestauranteResumen[] => {
  const items: RestauranteResumen[] = [];
  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      items.push(mapDocToResumen(doc.id, doc.data()));
    }
  }
  return items;
};

export class RestaurantesService {
  static async getRestaurantesByIds(ids: string[]): Promise<RestauranteResumen[]> {
    if (ids.length === 0) return [];

    const restaurantesRef = collection(db, 'restaurants');
    const chunks = chunkIds(ids);

    const snapshots = await Promise.all(
      chunks.map((chunk) => getDocs(query(restaurantesRef, where(documentId(), 'in', chunk))))
    );

    const items = collectFromSnapshots(snapshots);

    // Mantener el orden según la lista original de ids
    const byId = new Map(items.map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter((item): item is RestauranteResumen => Boolean(item));
  }

  static async getRestaurantesByOwnerId(ownerId: string): Promise<RestauranteResumen[]> {
    if (!ownerId) return [];

    const restaurantesRef = collection(db, 'restaurants');
    const snapshot = await getDocs(query(restaurantesRef, where('idPropietario', '==', ownerId)));
    return snapshot.docs.map((doc) => mapDocToResumen(doc.id, doc.data()));
  }

  static async getRestaurantesFiscalesByOwnerId(ownerId: string) {
    if (!ownerId) return [];

    const restaurantesRef = collection(db, 'restaurants');
    const snapshot = await getDocs(query(restaurantesRef, where('idPropietario', '==', ownerId)));
    return snapshot.docs.map((doc) => {
      const parsed = RestauranteSchema.parse(doc.data()) as Record<string, unknown>;
      const personales = (parsed.datos_personales as Record<string, unknown> | undefined) ?? {};
      const fiscales = (parsed.datos_fiscales as Record<string, unknown> | undefined) ?? {};
      const bancarios = (parsed.datos_bancarios as Record<string, unknown> | undefined) ?? {};
      return {
        id: doc.id,
        nombreRestaurante: String(parsed['Nombre del restaurante'] ?? ''),
        stripeAccountId: typeof parsed.stripeAccountId === 'string' ? parsed.stripeAccountId : '',
        email: String(personales.Email ?? ''),
        nombre: String(personales.nombre ?? ''),
        apellidos: String(personales.Apellidos ?? ''),
        prefijo: String(personales.Prefijo ?? ''),
        telefono: String(personales['Número de teléfono'] ?? ''),
        fechaNacimiento: String(personales['Fecha de nacimiento'] ?? ''),
        direccion: String(personales.Dirección ?? ''),
        ciudad: String(personales.Ciudad ?? ''),
        cp: String(personales.CP ?? ''),
        isBusiness: Boolean(fiscales.isBusiness ?? false),
        razonSocial: String(fiscales['Razón social'] ?? ''),
        nif: String(fiscales.NIF ?? ''),
        direccionFiscal: String(fiscales['Dirección Fiscal'] ?? ''),
        codigoPostalNegocio: String(fiscales['Código Postal del negocio'] ?? ''),
        ciudadNegocio: String(fiscales['Ciudad del negocio'] ?? ''),
        provinciaNegocio: String(fiscales['Provincia del negocio'] ?? ''),
        telefonoNegocio: String(fiscales['Teléfono del negocio'] ?? ''),
        contrato: String(fiscales.contrato ?? ''),
        numeroCuenta: String(bancarios['Numero de cuenta'] ?? ''),
        nombreTitular: String(bancarios['Nombre y apellidos del titular de la cuenta'] ?? ''),
        nombreBanco: String(bancarios['Nombre del banco'] ?? ''),
      };
    });
  }
}
