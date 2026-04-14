import {
  collection,
  DocumentSnapshot,
  FieldPath,
  documentId,
  OrderByDirection,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ReservaDocSchema, type ReservaDoc } from '@/lib/validators/reserva';

export type ReservaItem = ReservaDoc & { id: string };

export type ReservaFilterId = 'requiereAccion' | 'pendientes' | 'confirmadas' | 'completadas' | 'expiradas';

export type ReservasSort = 'fecha_desc' | 'fecha_asc' | 'restaurante_asc' | 'restaurante_desc' | 'estado_asc' | 'estado_desc';

export type ReservasCursor =
  | DocumentSnapshot
  | {
      pendienteGestion?: DocumentSnapshot | null;
      aceptadoNoPagado?: DocumentSnapshot | null;
      cambioRechazado?: DocumentSnapshot | null;
      estadoOrder?: { estado: string; id: string };
      multi?: Record<string, DocumentSnapshot | null>;
    };

export type ReservasMultiCursor = { multi: Record<string, DocumentSnapshot | null> };
export type ReservasRangeCursor = DocumentSnapshot | ReservasMultiCursor;


const getOrderBy = (sortBy: ReservasSort): { field: string | FieldPath; direction: OrderByDirection } => {
  if (sortBy.startsWith('restaurante')) {
    return { field: new FieldPath('restaurante', 'Nombre del restaurante'), direction: (sortBy.endsWith('asc') ? 'asc' : 'desc') as OrderByDirection };
  }
  if (sortBy.startsWith('estado')) {
    return { field: 'estado', direction: (sortBy.endsWith('asc') ? 'asc' : 'desc') as OrderByDirection };
  }
  return { field: 'kombo.Fecha', direction: (sortBy === 'fecha_asc' ? 'asc' : 'desc') as OrderByDirection };
};

export type ReservasPageResult = {
  items: ReservaItem[];
  cursor: ReservasCursor | null;
  hasMore: boolean;
};

export class ReservasService {
  private static isDocSnapshot(value: unknown): value is DocumentSnapshot {
    return Boolean(
      value &&
        typeof value === 'object' &&
        'id' in (value as Record<string, unknown>) &&
        'ref' in (value as Record<string, unknown>)
    );
  }
  private static chunkArray<T>(items: T[], chunkSize: number): T[][] {
    if (chunkSize <= 0) return [items];
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      result.push(items.slice(i, i + chunkSize));
    }
    return result;
  }

  private static compareReservaItems(
    a: ReservaItem,
    b: ReservaItem,
    order: { field: string | FieldPath; direction: OrderByDirection }
  ) {
    const direction = order.direction === 'asc' ? 1 : -1;
    if (order.field instanceof FieldPath) {
      const aName = a.restaurante?.['Nombre del restaurante'] ?? '';
      const bName = b.restaurante?.['Nombre del restaurante'] ?? '';
      const cmp = aName.localeCompare(bName, 'es-ES');
      if (cmp !== 0) return cmp * direction;
      return a.id.localeCompare(b.id, 'es-ES');
    }
    if (order.field === 'estado') {
      const aEstado = a.estado ?? '';
      const bEstado = b.estado ?? '';
      const cmp = aEstado.localeCompare(bEstado, 'es-ES');
      if (cmp !== 0) return cmp * direction;
      return a.id.localeCompare(b.id, 'es-ES');
    }
    const aDate = new Date(a.kombo?.Fecha ?? '');
    const bDate = new Date(b.kombo?.Fecha ?? '');
    const cmp = aDate.getTime() - bDate.getTime();
    if (cmp !== 0) return cmp * direction;
    return a.id.localeCompare(b.id, 'es-ES');
  }

  static async getById(reservaId: string): Promise<ReservaItem | null> {
    if (!reservaId) return null;
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const parsed = ReservaDocSchema.parse(snap.data());
    return { id: snap.id, ...parsed };
  }


  static async getCountsByPartnerId(params: {
    partnerId: string;
    restauranteId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const { partnerId, restauranteId, fechaDesde, fechaHasta } = params;
    if (!partnerId) {
      return {
        requiereAccion: 0,
        pendientes: 0,
        confirmadas: 0,
        completadas: 0,
        expiradas: 0,
      };
    }

    const ref = collection(db, 'reservas');
    const baseConstraints = [where('partnerId', '==', partnerId)];
    if (restauranteId) {
      baseConstraints.push(where('restaurante.id', '==', restauranteId));
    }
    if (fechaDesde) {
      baseConstraints.push(where('kombo.Fecha', '>=', fechaDesde));
    }
    if (fechaHasta) {
      baseConstraints.push(where('kombo.Fecha', '<=', fechaHasta));
    }

    const requiereAccionQuery = query(
      ref,
      ...baseConstraints,
      where('estado', 'in', ['pendiente', 'pendienteCambio', 'no_gestionado', 'expirado'])
    );

    const pendientesQueries = [
      query(ref, ...baseConstraints, where('estado', '==', 'pendienteGestion')),
      query(ref, ...baseConstraints, where('estado', '==', 'cambioRechazado')),
    ];

    const confirmadasQuery = query(
      ref,
      ...baseConstraints,
      where('estado', '==', 'aceptado')
    );

    const completadasQuery = query(
      ref,
      ...baseConstraints,
      where('estado', '==', 'completado')
    );

    const expiradasQuery = query(ref, ...baseConstraints, where('estado', '==', 'fallado'));

    const [requiereAccionCount, pendientesCounts, confirmadasCount, completadasCount, expiradasCount] =
      await Promise.all([
        getCountFromServer(requiereAccionQuery),
        Promise.all(pendientesQueries.map((q) => getCountFromServer(q))),
        getCountFromServer(confirmadasQuery),
        getCountFromServer(completadasQuery),
        getCountFromServer(expiradasQuery),
      ]);

    return {
      requiereAccion: requiereAccionCount.data().count ?? 0,
      pendientes: pendientesCounts.reduce((acc, res) => acc + (res.data().count ?? 0), 0),
      confirmadas: confirmadasCount.data().count ?? 0,
      completadas: completadasCount.data().count ?? 0,
      expiradas: expiradasCount.data().count ?? 0,
    };
  }

  static async getReservasPage(params: {
    partnerId: string;
    filter: ReservaFilterId;
    restauranteIds?: string[];
    responsableIds?: string[];
    sortBy?: ReservasSort;
    pageSize?: number;
    cursor?: ReservasCursor | null;
  }): Promise<ReservasPageResult> {
    const {
      partnerId,
      filter,
      restauranteIds = [],
      responsableIds = [],
      sortBy = 'fecha_desc',
      pageSize = 20,
      cursor,
    } = params;
    const ref = collection(db, 'reservas');
    if (!partnerId) return { items: [], cursor: null, hasMore: false };
    const ids = restauranteIds.filter(Boolean);
    const respIds = responsableIds.filter(Boolean);
    const buildRestauranteConstraint = (allIds: string[]) => {
      if (!allIds || allIds.length === 0) return [];
      if (allIds.length === 1) return [where('restaurante.id', '==', allIds[0])];
      return [where('restaurante.id', 'in', allIds)];
    };
    const buildResponsableConstraint = (allIds: string[]) => {
      if (!allIds || allIds.length === 0) return [];
      if (allIds.length === 1) return [where('responsableEquipo.id', '==', allIds[0])];
      return [where('responsableEquipo.id', 'in', allIds)];
    };
    const order = getOrderBy(sortBy);
    const tieBreaker = orderBy(documentId());

    if (filter === 'pendientes') {
      const baseConstraints = [where('partnerId', '==', partnerId)];
      const estados = ['pendienteGestion', 'cambioRechazado'];
      const constraint = buildRestauranteConstraint(ids);
      const responsableConstraint = buildResponsableConstraint(respIds);
      const orderCursor =
        cursor && typeof cursor === 'object' && 'estadoOrder' in cursor && cursor.estadoOrder
          ? [startAfter(cursor.estadoOrder.estado, cursor.estadoOrder.id)]
          : cursor && !(typeof cursor === 'object' && 'pendienteGestion' in cursor)
            ? [startAfter(cursor)]
            : [];
      const q = query(
        ref,
        ...baseConstraints,
        ...constraint,
        ...responsableConstraint,
        where('estado', 'in', estados),
        orderBy(order.field, order.direction),
        tieBreaker,
        ...orderCursor,
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const mergedItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...ReservaDocSchema.parse(doc.data()),
      }));
      const items = mergedItems
        .sort((a, b) => {
          const direction = order.direction === 'asc' ? 1 : -1;
          if (order.field instanceof FieldPath) {
            const aName = a.restaurante?.['Nombre del restaurante'] ?? '';
            const bName = b.restaurante?.['Nombre del restaurante'] ?? '';
            return aName.localeCompare(bName, 'es-ES') * direction;
          }
          if (order.field === 'estado') {
            const aEstado = a.estado ?? '';
            const bEstado = b.estado ?? '';
            return aEstado.localeCompare(bEstado, 'es-ES') * direction;
          }
          const aDate = new Date(a.kombo?.Fecha ?? '');
          const bDate = new Date(b.kombo?.Fecha ?? '');
          return (aDate.getTime() - bDate.getTime()) * direction;
        })
        .slice(0, pageSize);

      const hasMore = mergedItems.length > pageSize || snapshot.docs.length >= pageSize;

      const lastItem = items.at(-1);
      return {
        items,
        hasMore,
        cursor:
          order.field === 'estado' && lastItem
            ? { estadoOrder: { estado: lastItem.estado ?? '', id: lastItem.id } }
            : snapshot.docs.at(-1) ?? null,
      };
    }
    const baseConstraints = [where('partnerId', '==', partnerId)];

    if (filter === 'requiereAccion') {
      const estados = ['pendiente', 'pendienteCambio', 'pendientecambio', 'no_gestionado', 'expirado'];
      const restDisjunctions = ids.length > 1 ? ids.length : 1;
      const respDisjunctions = respIds.length > 1 ? respIds.length : 1;
      const disjunctions = estados.length * restDisjunctions * respDisjunctions;
      // Avoid Firestore disjunction limit (max 30) by splitting estado into separate queries when needed.
      if (disjunctions > 30) {
        const restChunkSize =
          ids.length > 1 ? Math.max(1, Math.min(ids.length, Math.floor(30 / respDisjunctions))) : ids.length;
        const restChunks = ids.length > 1 ? this.chunkArray(ids, restChunkSize) : [ids];

        const cursorMap: Record<string, DocumentSnapshot | null> =
          cursor && typeof cursor === 'object' && 'multi' in cursor && cursor.multi ? cursor.multi : {};

        const buildRestauranteConstraintForChunk = (allIds: string[]) => {
          if (!allIds || allIds.length === 0) return [];
          if (allIds.length === 1) return [where('restaurante.id', '==', allIds[0])];
          return [where('restaurante.id', 'in', allIds)];
        };
        const buildResponsableConstraintForChunk = (allIds: string[]) => {
          if (!allIds || allIds.length === 0) return [];
          if (allIds.length === 1) return [where('responsableEquipo.id', '==', allIds[0])];
          return [where('responsableEquipo.id', 'in', allIds)];
        };

        const queries = estados.flatMap((estado) =>
          restChunks.map((chunk) => {
            const key = `${estado}|${chunk.join(',') || 'all'}`;
            const start = cursorMap[key] ? [startAfter(cursorMap[key] as DocumentSnapshot)] : [];
            const q = query(
              ref,
              ...baseConstraints,
              ...buildRestauranteConstraintForChunk(chunk),
              ...buildResponsableConstraintForChunk(respIds),
              where('estado', '==', estado),
              orderBy(order.field, order.direction),
              tieBreaker,
              ...start,
              limit(pageSize)
            );
            return { key, q };
          })
        );

        const snapshots = await Promise.all(queries.map(({ q }) => getDocs(q)));
        const candidates = snapshots.flatMap((snapshot, idx) => {
          const key = queries[idx]?.key ?? '';
          return snapshot.docs.map((docSnap) => {
            const parsed = ReservaDocSchema.parse(docSnap.data());
            return { key, snap: docSnap, item: { id: docSnap.id, ...parsed } as ReservaItem };
          });
        });

        const unique = new Map<string, { key: string; snap: DocumentSnapshot; item: ReservaItem }>();
        candidates.forEach((c) => {
          if (!unique.has(c.item.id)) unique.set(c.item.id, c);
        });
        const sorted = Array.from(unique.values())
          .sort((a, b) => this.compareReservaItems(a.item, b.item, order))
          .slice(0, pageSize);

        const usedCountByKey = new Map<string, number>();
        sorted.forEach(({ key, snap }) => {
          usedCountByKey.set(key, (usedCountByKey.get(key) ?? 0) + 1);
          cursorMap[key] = snap;
        });

        const hasMore = snapshots.some((snap, idx) => {
          const key = queries[idx]?.key ?? '';
          const used = usedCountByKey.get(key) ?? 0;
          return snap.docs.length > used || snap.docs.length >= pageSize;
        });

        return {
          items: sorted.map((c) => c.item),
          cursor: { multi: cursorMap },
          hasMore,
        };
      }
      baseConstraints.push(where('estado', 'in', estados));
    }

    if (filter === 'confirmadas') {
      baseConstraints.push(where('estado', '==', 'aceptado'));
    }

    if (filter === 'completadas') {
      baseConstraints.push(where('estado', '==', 'completado'));
    }

    if (filter === 'expiradas') {
      baseConstraints.push(where('estado', '==', 'fallado'));
    }

    const constraint = buildRestauranteConstraint(ids);
    const responsableConstraint = buildResponsableConstraint(respIds);
    const orderCursor =
      cursor && typeof cursor === 'object' && 'estadoOrder' in cursor && cursor.estadoOrder
        ? [startAfter(cursor.estadoOrder.estado, cursor.estadoOrder.id)]
        : cursor && !(typeof cursor === 'object' && 'pendienteGestion' in cursor)
          ? [startAfter(cursor)]
          : [];
    const q = query(
      ref,
      ...baseConstraints,
      ...constraint,
      ...responsableConstraint,
      orderBy(order.field, order.direction),
      tieBreaker,
      ...orderCursor,
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    const mergedItems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...ReservaDocSchema.parse(doc.data()),
    }));
    const items = mergedItems.slice(0, pageSize);

    const hasMore = mergedItems.length > pageSize || snapshot.docs.length >= pageSize;

    const lastItem = items.at(-1);
    return {
      items,
      cursor:
        order.field === 'estado' && lastItem
          ? { estadoOrder: { estado: lastItem.estado ?? '', id: lastItem.id } }
          : snapshot.docs.at(-1) ?? null,
      hasMore,
    };
  }

  static async getReservasByRange(params: {
    partnerId: string;
    filters?: ReservaFilterId[];
    restauranteId?: string | string[];
    sortBy?: ReservasSort;
    fechaDesde: string;
    fechaHasta: string;
  }): Promise<ReservaItem[]> {
    const { partnerId, filters, restauranteId, sortBy = 'fecha_desc', fechaDesde, fechaHasta } = params;
    const ref = collection(db, 'reservas');
    if (!partnerId) return [];

    const baseConstraints = [where('partnerId', '==', partnerId)];
    const restauranteIds = Array.isArray(restauranteId) ? restauranteId : restauranteId ? [restauranteId] : [];
    const buildRestauranteConstraint = (allIds: string[]) => {
      if (!allIds || allIds.length === 0) return [];
      if (allIds.length === 1) return [where('restaurante.id', '==', allIds[0])];
      return [where('restaurante.id', 'in', allIds)];
    };
    baseConstraints.push(where('kombo.Fecha', '>=', fechaDesde));
    baseConstraints.push(where('kombo.Fecha', '<=', fechaHasta));

    const activeFilters = filters?.length ? filters : [];
    // For range queries, Firestore best practice: order by the ranged field.
    const order: { field: string | FieldPath; direction: OrderByDirection } = { field: 'kombo.Fecha', direction: (sortBy === 'fecha_asc' ? 'asc' : 'desc') as OrderByDirection };

    const queries: ReturnType<typeof query>[] = [];
    const pushQuery = (...constraints: Parameters<typeof query>[1][]) => {
      queries.push(query(ref, ...constraints));
    };

    if (!activeFilters.length) {
      pushQuery(...baseConstraints, ...buildRestauranteConstraint(restauranteIds), orderBy(order.field, order.direction));
    } else {
      activeFilters.forEach((filter) => {
        if (filter === 'pendientes') {
          pushQuery(
            ...baseConstraints,
            ...buildRestauranteConstraint(restauranteIds),
            where('estado', '==', 'pendienteGestion'),
            orderBy(order.field, order.direction)
          );
          pushQuery(
            ...baseConstraints,
            ...buildRestauranteConstraint(restauranteIds),
            where('estado', '==', 'cambioRechazado'),
            orderBy(order.field, order.direction)
          );
          return;
        }
        if (filter === 'requiereAccion') {
          const estados = ['pendiente', 'pendienteCambio', 'no_gestionado', 'expirado'];
          estados.forEach((estado) => {
            pushQuery(
              ...baseConstraints,
              ...buildRestauranteConstraint(restauranteIds),
              where('estado', '==', estado),
              orderBy(order.field, order.direction)
            );
          });
          return;
        }
        if (filter === 'confirmadas') {
          pushQuery(
            ...baseConstraints,
            ...buildRestauranteConstraint(restauranteIds),
            where('estado', '==', 'aceptado'),
            orderBy(order.field, order.direction)
          );
          return;
        }
        if (filter === 'completadas') {
          pushQuery(
            ...baseConstraints,
            ...buildRestauranteConstraint(restauranteIds),
            where('estado', '==', 'completado'),
            orderBy(order.field, order.direction)
          );
          return;
        }
        if (filter === 'expiradas') {
          pushQuery(
            ...baseConstraints,
            ...buildRestauranteConstraint(restauranteIds),
            where('estado', '==', 'fallado'),
            orderBy(order.field, order.direction)
          );
        }
      });
    }

    const snapshots = await Promise.all(queries.map((q) => getDocs(q)));
    const items = snapshots.flatMap((snapshot) =>
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...ReservaDocSchema.parse(doc.data()),
      }))
    );
    const unique = new Map(items.map((item) => [item.id, item]));
    return Array.from(unique.values()).sort((a, b) => {
      const aDate = new Date(a.kombo?.Fecha ?? '');
      const bDate = new Date(b.kombo?.Fecha ?? '');
      return order.direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
    });
  }

  static async getReservasByRangePage(params: {
    partnerId: string;
    filters?: ReservaFilterId[];
    restauranteId?: string | string[];
    responsableIds?: string[];
    sortBy?: ReservasSort;
    fechaDesde: string;
    fechaHasta: string;
    pageSize?: number;
    cursor?: ReservasRangeCursor | null;
  }): Promise<{ items: ReservaItem[]; cursor: ReservasRangeCursor | null; hasMore: boolean }> {
    const {
      partnerId,
      filters,
      restauranteId,
      responsableIds = [],
      sortBy = 'fecha_desc',
      fechaDesde,
      fechaHasta,
      pageSize = 10,
      cursor,
    } = params;
    if (!partnerId) return { items: [], cursor: null, hasMore: false };
    const ref = collection(db, 'reservas');

    const baseConstraints = [where('partnerId', '==', partnerId)];
    const normalizedDesde = fechaDesde.length === 10 ? fechaDesde : fechaDesde.split('T')[0] ?? fechaDesde;
    const normalizedHasta =
      fechaHasta.length === 10 ? `${fechaHasta}T23:59:59.999` : `${fechaHasta.split('T')[0] ?? fechaHasta}T23:59:59.999`;
    baseConstraints.push(where('kombo.Fecha', '>=', normalizedDesde));
    baseConstraints.push(where('kombo.Fecha', '<=', normalizedHasta));

    const restauranteIds = Array.isArray(restauranteId) ? restauranteId : restauranteId ? [restauranteId] : [];
    const respIds = responsableIds.filter(Boolean);
    const buildRestauranteConstraint = (allIds: string[]) => {
      if (!allIds || allIds.length === 0) return [];
      if (allIds.length === 1) return [where('restaurante.id', '==', allIds[0])];
      return [where('restaurante.id', 'in', allIds)];
    };
    const buildResponsableConstraint = (allIds: string[]) => {
      if (!allIds || allIds.length === 0) return [];
      if (allIds.length === 1) return [where('responsableEquipo.id', '==', allIds[0])];
      return [where('responsableEquipo.id', 'in', allIds)];
    };

    const activeFilter = filters?.[0];
    const filterEstados =
      activeFilter === 'pendientes'
        ? ['pendienteGestion', 'cambioRechazado']
        : activeFilter === 'requiereAccion'
          ? ['pendiente', 'pendienteCambio', 'pendientecambio', 'no_gestionado', 'expirado']
          : null;
    if (activeFilter === 'confirmadas') {
      baseConstraints.push(where('estado', '==', 'aceptado'));
    }
    if (activeFilter === 'completadas') {
      baseConstraints.push(where('estado', '==', 'completado'));
    }
    if (activeFilter === 'expiradas') {
      baseConstraints.push(where('estado', '==', 'fallado'));
    }

    const order: { field: string | FieldPath; direction: OrderByDirection } = {
      field: 'kombo.Fecha',
      direction: (sortBy === 'fecha_asc' ? 'asc' : 'desc') as OrderByDirection,
    };

    if (filterEstados) {
      const restDisjunctions = restauranteIds.length > 1 ? restauranteIds.length : 1;
      const respDisjunctions = respIds.length > 1 ? respIds.length : 1;
      const disjunctions = filterEstados.length * restDisjunctions * respDisjunctions;

      // Avoid Firestore disjunction limit (max 30) by splitting estado into separate queries when needed.
      if (disjunctions > 30) {
        const restChunkSize =
          restauranteIds.length > 1
            ? Math.max(1, Math.min(restauranteIds.length, Math.floor(30 / respDisjunctions)))
            : restauranteIds.length;
        const restChunks = restauranteIds.length > 1 ? this.chunkArray(restauranteIds, restChunkSize) : [restauranteIds];

        const cursorMap: Record<string, DocumentSnapshot | null> =
          cursor && typeof cursor === 'object' && cursor && 'multi' in cursor && (cursor as ReservasMultiCursor).multi
            ? (cursor as ReservasMultiCursor).multi
            : {};

        const queries = filterEstados.flatMap((estado) =>
          restChunks.map((chunk) => {
            const key = `${estado}|${chunk.join(',') || 'all'}`;
            const start = cursorMap[key] ? [startAfter(cursorMap[key] as DocumentSnapshot)] : [];
            const q = query(
              ref,
              ...baseConstraints,
              ...buildRestauranteConstraint(chunk),
              ...buildResponsableConstraint(respIds),
              where('estado', '==', estado),
              orderBy(order.field, order.direction),
              ...start,
              limit(pageSize)
            );
            return { key, q };
          })
        );

        const snapshots = await Promise.all(queries.map(({ q }) => getDocs(q)));
        const candidates = snapshots.flatMap((snapshot, idx) => {
          const key = queries[idx]?.key ?? '';
          return snapshot.docs.map((docSnap) => {
            const parsed = ReservaDocSchema.parse(docSnap.data());
            return { key, snap: docSnap, item: { id: docSnap.id, ...parsed } as ReservaItem };
          });
        });

        const unique = new Map<string, { key: string; snap: DocumentSnapshot; item: ReservaItem }>();
        candidates.forEach((c) => {
          if (!unique.has(c.item.id)) unique.set(c.item.id, c);
        });
        const sorted = Array.from(unique.values())
          .sort((a, b) => this.compareReservaItems(a.item, b.item, order))
          .slice(0, pageSize);

        const usedCountByKey = new Map<string, number>();
        sorted.forEach(({ key, snap }) => {
          usedCountByKey.set(key, (usedCountByKey.get(key) ?? 0) + 1);
          cursorMap[key] = snap;
        });

        const hasMore = snapshots.some((snap, idx) => {
          const key = queries[idx]?.key ?? '';
          const used = usedCountByKey.get(key) ?? 0;
          return snap.docs.length > used || snap.docs.length >= pageSize;
        });

        return {
          items: sorted.map((c) => c.item),
          cursor: { multi: cursorMap },
          hasMore,
        };
      }

      baseConstraints.push(where('estado', 'in', filterEstados));
    }

    const q = query(
      ref,
      ...baseConstraints,
      ...buildRestauranteConstraint(restauranteIds),
      ...buildResponsableConstraint(respIds),
      orderBy(order.field, order.direction),
      ...(this.isDocSnapshot(cursor) ? [startAfter(cursor)] : []),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...ReservaDocSchema.parse(doc.data()),
    }));

    return {
      items,
      cursor: snapshot.docs.at(-1) ?? null,
      hasMore: snapshot.docs.length >= pageSize,
    };
  }
}
