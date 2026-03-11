import { addDoc, arrayUnion, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PackCatalogItem } from '@/lib/services/pack-catalog.service';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';
import { buildReservaCreadaEmail } from '@/lib/emails/reservas';

const MAIL_ENDPOINT = process.env.NEXT_PUBLIC_SEND_MAIL_URL ?? '';
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? '';

export type ReservaCreatePayload = {
  partnerId: string;
  restaurante: RestauranteDetalleDoc;
  sala: NonNullable<RestauranteDetalleDoc['salas']>[number];
  pack: PackCatalogItem | null;
  packId: string;
  selectedElement: Record<string, unknown> | null;
  selectedInterval: Record<string, unknown> | null;
  selectedTickets: Array<Record<string, unknown>>;
  adhocItems?: Array<{
    source: 'plan_ticket' | 'barra' | 'racion' | 'manual';
    tipo?: 'comida' | 'bebida';
    name: string;
    quantity: number;
    price: number;
  }>;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  fechaLimite: string;
  aforoMin: number;
  aforoMax: number;
  nombreUsuario: string;
  email?: string;
  anticipoActivo: boolean;
  anticipoDescripcion?: string;
  anticipoPrecio?: number;
  questions?: Array<{
    question: string;
    question_type: 'string' | 'choice' | 'boolean';
    required: boolean;
    options?: string[];
  }>;
};

const buildPrecio = (payload: ReservaCreatePayload) => {
  const precio: Record<string, unknown> = {};

  const packType = payload.pack?.Categoria ?? '';
  const subcategoria = payload.pack?.Subcategoria ?? null;

  if (payload.packId === 'adhoc') {
    const items = (payload.adhocItems ?? []).map((item) => ({
      tipo: item.tipo ?? item.source,
      nombre: item.name,
      cantidad: item.quantity,
      precio_unitario: item.price,
      total: item.price * item.quantity,
      total_cents: Math.round(item.price * item.quantity * 100),
    }));
    const total = items.reduce((sum, item) => sum + item.total, 0);
    precio.adhoc = {
      items,
      total,
      total_cents: Math.round(total * 100),
    };
    return precio;
  }

  if (payload.packId === 'sin_compra_anticipada') {
    if (payload.anticipoActivo && payload.anticipoDescripcion && payload.anticipoPrecio != null) {
      precio.Anticipo = {
        'Descripción': payload.anticipoDescripcion,
        Precio: payload.anticipoPrecio,
      };
    }
    return precio;
  }

  if (packType === 'Menú' && payload.selectedElement) {
    precio['Menú'] = payload.selectedElement;
  } else if (packType === 'Cocktail' && payload.selectedElement) {
    precio.Cocktail = payload.selectedElement;
  } else if (packType === 'Tickets') {
    const tickets = (payload.selectedTickets ?? []).filter((ticket) => !ticket.disabled);
    precio.Tickets = tickets.map((ticket) => ({
      price: Number(ticket.Precio ?? ticket.precio ?? 0),
      quantity: Number(ticket.quantity ?? ticket.cantidad ?? payload.aforoMax),
      ticket: ticket.Nombre ?? 'Ticket',
    }));
  } else if (packType === 'Best Deal' && subcategoria === 'Barra Libre' && payload.selectedElement) {
    const element = { ...payload.selectedElement } as Record<string, unknown>;
    if (payload.selectedInterval) {
      element.intervaloSeleccionado = payload.selectedInterval;
      element.Precio = Number((payload.selectedInterval as Record<string, unknown>).precio ?? 0);
    }
    precio['Barra Libre'] = element;
  }

  return precio;
};

const normalizeToken = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const addSearchTerms = (terms: Set<string>, raw?: string) => {
  if (!raw) return;
  const normalized = normalizeToken(raw);
  if (!normalized) return;
  terms.add(normalized);
  normalized.split(' ').forEach((token) => {
    if (token) terms.add(token);
  });
};

const buildSearchTerms = (payload: ReservaCreatePayload) => {
  const terms = new Set<string>();
  const fecha = payload.fecha ?? '';
  const [yyyy, mm, dd] = fecha.split('-');

  addSearchTerms(terms, payload.nombreUsuario);
  addSearchTerms(terms, payload.email ?? '');
  addSearchTerms(terms, payload.restaurante['Nombre del restaurante'] ?? '');
  addSearchTerms(terms, payload.sala?.nombre ?? '');
  addSearchTerms(terms, payload.pack?.['Nombre del pack'] ?? '');
  addSearchTerms(terms, payload.pack?.Categoria ?? '');
  addSearchTerms(terms, payload.pack?.Subcategoria ?? '');

  addSearchTerms(terms, 'aceptado');
  addSearchTerms(terms, 'activa');

  if (yyyy) terms.add(yyyy);
  if (mm) terms.add(mm);
  if (dd) terms.add(dd);

  const times = [payload.horaInicio, payload.horaFin].filter(Boolean) as string[];
  times.forEach((time) => {
    const compact = time.replace(':', '');
    addSearchTerms(terms, time);
    addSearchTerms(terms, compact);
    const [hh, min] = time.split(':');
    if (hh) terms.add(hh);
    if (min) terms.add(min);
  });

  return Array.from(terms);
};

export class ReservaCreateService {
  static async create(payload: ReservaCreatePayload) {
    const reservasRef = collection(db, 'reservas');
    const restauranteId = typeof payload.restaurante.id === 'string' ? payload.restaurante.id : '';
    const isConsumoLibreSinAnticipo = payload.packId === 'sin_compra_anticipada' && !payload.anticipoActivo;
    const estadoBase = isConsumoLibreSinAnticipo ? 'pendienteGestion' : 'aceptado';
    const evento = {
      avatarUrl: '',
      descripcionSala: '',
      estado: estadoBase,
      estadoKomvo: 'activa',
      estadoSala: 'activa',
      fechaLimitePago: payload.fechaLimite,
      fechaLimiteSala: payload.fechaLimite,
      fechaLimiteAsistentes: payload.fechaLimite,
      kombo: {
        'Nombre del kombo': '',
        'Tamaño del grupo': {
          max: String(payload.aforoMax),
          min: String(payload.aforoMin),
        },
        Fecha: payload.fecha,
        Hora: payload.horaInicio,
        horaFin: payload.horaFin,
        FechaCreacion: new Date(),
        'Descripción': '',
      },
      restaurante: {
        id: restauranteId,
        slug: payload.restaurante.slug ?? '',
        'Nombre del restaurante': payload.restaurante['Nombre del restaurante'] ?? '',
        horaCierre: payload.restaurante.horaCierre ?? '',
        Ubicación: payload.restaurante.Ubicación ?? payload.restaurante.Ubicacion ?? '',
        'Dirección': payload.restaurante['Dirección'] ?? payload.restaurante['Direccion'] ?? '',
        'Código Postal': payload.restaurante['Código Postal'] ?? payload.restaurante['Codigo Postal'] ?? '',
        'Imagenes del restaurante': payload.restaurante['Imagenes del restaurante'] ?? [],
      },
      sala: payload.sala,
      pack:
        payload.pack && payload.pack.Categoria === 'Tickets'
          ? {
              ...payload.pack,
              Tickets: payload.selectedTickets,
            }
          : payload.pack ?? null,
      pagado: false,
      partnerId: payload.partnerId,
      usuario: {
        Email: payload.email ?? '',
        'Nombre de usuario': payload.nombreUsuario,
      },
      tipoCompra: '',
      precio: buildPrecio(payload),
      leadKomvo: false,
      usuarioRegistrado: false,
      fechaSolicitud: new Date(),
      searchTerms: buildSearchTerms(payload),
      searchTermsUpdated: new Date(),
    };

    if (payload.questions && payload.questions.length > 0) {
      (evento as Record<string, unknown>).questions = payload.questions;
    }

    const docRef = await addDoc(reservasRef, evento);
    const reservaId = docRef.id;

    if (payload.partnerId) {
      await updateDoc(doc(db, 'partners', payload.partnerId), {
        reservas: arrayUnion(reservaId),
      });
    }

    if (restauranteId) {
      await updateDoc(doc(db, 'restaurants', restauranteId), {
        reservas: arrayUnion(reservaId),
      });
    }

    if (MAIL_ENDPOINT && WEB_URL && payload.email) {
      const isConsumoLibreSinAnticipo = payload.packId === 'sin_compra_anticipada' && !payload.anticipoActivo;
      const manageUrl = isConsumoLibreSinAnticipo
        ? `${WEB_URL}/plan/${reservaId}/gestionar`
        : `${WEB_URL}/pres/${reservaId}`;
      const logoUrl = `${WEB_URL}/komvo/logotipo-black.png`;
      const packName =
        payload.pack?.['Nombre del pack'] ??
        (payload.packId === 'sin_compra_anticipada'
          ? 'Consumo libre en el local'
          : payload.packId === 'adhoc'
            ? 'Presupuesto personalizado'
            : 'Reserva');
      const { subject, htmlContent } = buildReservaCreadaEmail({
        isAdhoc: payload.packId === 'adhoc',
        isConsumoLibreSinAnticipo,
        manageUrl,
        logoUrl,
        data: {
          restauranteNombre: payload.restaurante['Nombre del restaurante'] ?? '',
          salaNombre: payload.sala?.nombre ?? '',
          planNombre: packName ?? '',
          fecha: payload.fecha,
          horaInicio: payload.horaInicio,
          horaFin: payload.horaFin,
          aforoMin: payload.aforoMin,
          aforoMax: payload.aforoMax,
        },
      });

      void fetch(MAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: payload.email,
          subject,
          htmlContent,
        }),
      }).catch((error) => {
        console.error('[reservaCreate] email failed', error);
      });
    }

    return reservaId;
  }
}
