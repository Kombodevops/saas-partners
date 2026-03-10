import {
  collection,
  onSnapshot,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  limit,
  Timestamp,
  serverTimestamp,
  writeBatch,
  increment,
  setDoc,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthService } from '@/lib/services/auth.service';
import { ReservaDocSchema, type ReservaDoc } from '@/lib/validators/reserva';
import { ChatDocSchema, ChatInboxDocSchema, type ChatDoc, type ChatInboxDoc } from '@/lib/validators/chat';
import { RestauranteDetalleDocSchema } from '@/lib/validators/restaurante-detalle';
import type { PackCatalogItem } from '@/lib/services/pack-catalog.service';
import {
  buildCambioEstadoEmail,
  buildExpiradaEstadoEmail,
  buildFechaLimiteEmail,
  buildReservaManageEmail,
  buildReservaUpdateEmail,
} from '@/lib/emails/reservas';
import {
  AsistenciaDocSchema,
  type AsistenciaDoc,
  ChatMessageSchema,
  type ChatMessageDoc,
  FacturaDocSchema,
  type FacturaDoc,
  NotaSchema,
  type NotaDoc,
  EtiquetaSchema,
  type EtiquetaDoc,
} from '@/lib/validators/reserva-detalle';

export type ReservaDetalle = ReservaDoc & { id: string };
export type ChatDetalle = ChatDoc & { id: string };
export type ChatInboxDetalle = ChatInboxDoc & { id: string };
export type AsistenciaDetalle = AsistenciaDoc & { id: string };
export type FacturaDetalle = FacturaDoc & { id: string };
export type ChatMessageDetalle = ChatMessageDoc & { id: string };
export type NotaDetalle = NotaDoc;
export type EtiquetaDetalle = EtiquetaDoc;

const MAIL_ENDPOINT = process.env.NEXT_PUBLIC_SEND_MAIL_URL ?? '';
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? '';

export class ReservaDetalleService {
  static async getReservaById(reservaId: string): Promise<ReservaDetalle | null> {
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const parsed = ReservaDocSchema.parse(snap.data());
    return { id: snap.id, ...parsed };
  }

  static async getChatByReservaId(reservaId: string): Promise<ChatDetalle | null> {
    const ref = collection(db, 'chats');
    const q = query(ref, where('reservaId', '==', reservaId), limit(1));
    const snap = await getDocs(q);
    const docSnap = snap.docs[0];
    if (!docSnap) return null;
    const parsed = ChatDocSchema.parse(docSnap.data());
    return { id: docSnap.id, ...parsed };
  }

  static async getChatMensajes(chatId?: string) {
    if (!chatId) return { total: 0, mensajes: [] as ChatMessageDetalle[] };
    const mensajesRef = collection(db, 'chats', chatId, 'messages');
    const totalSnap = await getCountFromServer(mensajesRef);
    const total = totalSnap.data().count ?? 0;
    const mensajesSnap = await getDocs(
      query(mensajesRef, orderBy('timestamp', 'desc'), limit(3))
    );
    const mensajes = mensajesSnap.docs
      .map((docItem) => ({ id: docItem.id, ...ChatMessageSchema.parse(docItem.data()) }))
      .reverse();
    return { total, mensajes };
  }

  static async getChatMensajesPage(params: {
    chatId?: string;
    pageSize?: number;
    cursor?: import('firebase/firestore').QueryDocumentSnapshot | null;
  }) {
    const { chatId, pageSize = 20, cursor } = params;
    if (!chatId) {
      return {
        mensajes: [] as ChatMessageDetalle[],
        cursor: null as import('firebase/firestore').QueryDocumentSnapshot | null,
        hasMore: false,
        total: 0,
      };
    }
    const mensajesRef = collection(db, 'chats', chatId, 'messages');
    const totalSnap = await getCountFromServer(mensajesRef);
    const total = totalSnap.data().count ?? 0;
    const baseQuery = query(mensajesRef, orderBy('timestamp', 'desc'), limit(pageSize));
    const mensajesSnap = cursor
      ? await getDocs(query(mensajesRef, orderBy('timestamp', 'desc'), startAfter(cursor), limit(pageSize)))
      : await getDocs(baseQuery);

    const nextCursor = mensajesSnap.docs[mensajesSnap.docs.length - 1] ?? null;
    const mensajes = mensajesSnap.docs
      .map((docItem) => ({ id: docItem.id, ...ChatMessageSchema.parse(docItem.data()) }))
      .reverse();

    return {
      mensajes,
      cursor: nextCursor,
      hasMore: Boolean(nextCursor) && mensajesSnap.docs.length === pageSize,
      total,
    };
  }

  static listenMensajes(
    chatId: string,
    onMessages: (messages: ChatMessageDetalle[]) => void,
    params?: { since?: Timestamp | null }
  ) {
    const mensajesRef = collection(db, 'chats', chatId, 'messages');
    const since = params?.since ?? null;
    const base = [orderBy('timestamp', 'asc'), limit(20)];
    const q = since
      ? query(mensajesRef, where('timestamp', '>', since), ...base)
      : query(mensajesRef, ...base);
    return onSnapshot(q, (snapshot) => {
      const mensajes = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...ChatMessageSchema.parse(docItem.data()),
      }));
      onMessages(mensajes);
    });
  }

  static async getChatInbox(params: { chatId?: string | null; partnerId?: string | null }) {
    const { chatId, partnerId } = params;
    if (!chatId || !partnerId) {
      return { unreadCount: 0 };
    }
    const inboxId = `partner_${partnerId}`;
    const inboxRef = doc(db, 'chats', chatId, 'inbox', inboxId);
    const inboxSnap = await getDoc(inboxRef);
    if (!inboxSnap.exists()) return { unreadCount: 0 };
    const parsed = ChatInboxDocSchema.parse(inboxSnap.data());
    return { unreadCount: parsed.unreadCount ?? 0 };
  }

  static async clearChatUnread(params: { chatId?: string | null; partnerId?: string | null }) {
    const { chatId, partnerId } = params;
    if (!chatId || !partnerId) return;
    const inboxRef = doc(db, 'chats', chatId, 'inbox', `partner_${partnerId}`);
    await updateDoc(inboxRef, { unreadCount: 0, lastSeenAt: serverTimestamp() });
  }

  static listenChatInbox(params: {
    chatId?: string | null;
    partnerId?: string | null;
    onChange: (unreadCount: number) => void;
  }) {
    const { chatId, partnerId, onChange } = params;
    if (!chatId || !partnerId) return () => {};
    const inboxRef = doc(db, 'chats', chatId, 'inbox', `partner_${partnerId}`);
    return onSnapshot(inboxRef, (snap) => {
      if (!snap.exists()) {
        onChange(0);
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      const unread = typeof data.unreadCount === 'number' ? data.unreadCount : 0;
      onChange(unread);
    });
  }

  static async createChatForReserva(params: {
    reservaId: string;
    restauranteId?: string | null;
    nombreRestaurante?: string | null;
    partnerId: string;
    partnerNombre: string;
    usuarioId: string;
    usuarioNombre?: string | null;
  }) {
    const {
      reservaId,
      restauranteId,
      nombreRestaurante,
      partnerId,
      partnerNombre,
      usuarioId,
      usuarioNombre,
    } = params;

    const chatRef = doc(collection(db, 'chats'));
    const now = serverTimestamp();
    let responsableNombre = '';
    if (restauranteId) {
      const restauranteSnap = await getDoc(doc(db, 'restaurants', restauranteId));
      if (restauranteSnap.exists()) {
        const data = restauranteSnap.data() as Record<string, unknown>;
        const responsable = data.responsable as Record<string, unknown> | undefined;
        if (responsable && typeof responsable.nombre === 'string') {
          responsableNombre = responsable.nombre.trim();
        }
      }
    }
    const partnerDisplayName = responsableNombre || partnerNombre || nombreRestaurante || 'Restaurante';
    const chatNombre = `${partnerDisplayName} - ${usuarioNombre ?? 'Cliente'}`;

    const batch = writeBatch(db);
    batch.set(chatRef, {
      activo: true,
      reservaId,
      restauranteId: restauranteId ?? null,
      nombreRestaurante: nombreRestaurante ?? '',
      nombreChat: chatNombre,
      lastMessageAt: now,
      lastMessageSenderId: '',
      participants: {
        partners: {
          id: partnerId,
          nombre: partnerDisplayName,
          oculto: false,
        },
        users: {
          id: usuarioId,
          nombre: usuarioNombre ?? 'Cliente',
          oculto: false,
        },
      },
    });

    const inboxPartnerRef = doc(chatRef, 'inbox', `partner_${partnerId}`);
    const inboxUserRef = doc(chatRef, 'inbox', `user_${usuarioId}`);
    batch.set(
      inboxPartnerRef,
      {
        ownerType: 'partner',
        ownerId: partnerId,
        ownerKey: `partner_${partnerId}`,
        unreadCount: 0,
        lastMessageAt: now,
        lastMessageSenderId: '',
        chatId: chatRef.id,
        reservaId,
      },
      { merge: true }
    );
    batch.set(
      inboxUserRef,
      {
        ownerType: 'user',
        ownerId: usuarioId,
        ownerKey: `user_${usuarioId}`,
        unreadCount: 0,
        lastMessageAt: now,
        lastMessageSenderId: '',
        chatId: chatRef.id,
        reservaId,
      },
      { merge: true }
    );

    await batch.commit();
    return chatRef.id;
  }

  static async enviarMensaje(params: {
    chatId: string;
    content: string;
  }) {
    const { chatId, content } = params;
    const authUser = AuthService.getCurrentUser();
    if (!authUser) return { ok: false, reason: 'missing-auth' as const };
    if (!chatId || !content.trim()) return { ok: false, reason: 'invalid-input' as const };

    const partnerId = authUser.uid;
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) return { ok: false, reason: 'missing-chat' as const };

    const chatData = chatSnap.data() as Record<string, unknown>;
    const participants = chatData.participants as Record<string, unknown> | undefined;
    const partners = participants?.partners as Record<string, unknown> | undefined;
    const users = participants?.users as Record<string, unknown> | undefined;

    const partnerName =
      (partners?.nombre as string | undefined) ||
      (chatData.nombreRestaurante as string | undefined) ||
      'Restaurante';

    let userId =
      (users?.id as string | undefined) ||
      ((chatData.users as Record<string, unknown> | undefined)?.id as string | undefined) ||
      '';

    if (!userId) {
      // keep empty; inbox user will be skipped
      userId = '';
    }

    const messagesCol = collection(chatRef, 'messages');
    const inboxUserRef = doc(chatRef, 'inbox', `user_${userId || 'unknown'}`);
    const inboxPartnerRef = doc(chatRef, 'inbox', `partner_${partnerId}`);

    const now = serverTimestamp();

    const finalSender = {
      id: partnerId,
      nombre: partnerName,
    };

    const newMsgRef = doc(messagesCol);

    const batch = writeBatch(db);

    batch.set(newMsgRef, {
      content: content.trim(),
      sender: finalSender,
      timestamp: now,
      leido: false,
    });

    batch.set(
      chatRef,
      {
        ultimoMensaje: {
          content: content.trim(),
          sender: finalSender,
          timestamp: now,
        },
        lastMessageAt: now,
        lastMessageSenderId: finalSender.id,
      },
      { merge: true }
    );

    if (userId) {
      batch.set(
        inboxUserRef,
        {
          ownerType: 'user',
          ownerId: userId,
          ownerKey: `user_${userId}`,
          unreadCount: increment(1),
          lastMessageAt: now,
          lastMessageSenderId: finalSender.id,
        },
        { merge: true }
      );
    }

    batch.set(
      inboxPartnerRef,
      {
        ownerType: 'partner',
        ownerId: partnerId,
        ownerKey: `partner_${partnerId}`,
        unreadCount: increment(0),
        lastMessageAt: now,
        lastMessageSenderId: finalSender.id,
      },
      { merge: true }
    );

    await batch.commit();
    return { ok: true as const };
  }

  static async getClienteDatos(params: {
    reservaId: string;
    clienteId?: string | null;
    clienteEmail?: string | null;
    clienteTelefono?: string | null;
  }) {
    const { reservaId, clienteId, clienteEmail, clienteTelefono } = params;
    try {
      const reservaDoc = await getDoc(doc(db, 'reservas', reservaId));
      if (reservaDoc.exists()) {
        const data = reservaDoc.data() as Record<string, unknown>;
        const usuario = data.usuario as Record<string, unknown> | undefined;
        if (usuario) {
          const emailFromReserva =
            (usuario.Email as string | undefined) ??
            (usuario.email as string | undefined) ??
            (clienteEmail || null);
          const telefonoFromReserva =
            (usuario.Telefono as string | undefined) ??
            (usuario.telefono as string | undefined) ??
            (clienteTelefono || null);
          if (emailFromReserva || telefonoFromReserva || !clienteId) {
            return { email: emailFromReserva, telefono: telefonoFromReserva };
          }
        }
      }

      let email = clienteEmail || null;
      let telefono = clienteTelefono || null;
      if ((!email || !telefono) && clienteId) {
        const userDoc = await getDoc(doc(db, 'users', clienteId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as Record<string, unknown>;
          email =
            (userData.Email as string | undefined) ??
            (userData.email as string | undefined) ??
            (userData['EMAIL'] as string | undefined) ??
            email;
          telefono =
            (userData['Número de teléfono'] as string | undefined) ??
            (userData.Telefono as string | undefined) ??
            (userData.telefono as string | undefined) ??
            telefono;
        }
      }

      return { email, telefono };
    } catch {
      return { email: clienteEmail || null, telefono: clienteTelefono || null };
    }
  }

  static async getAsistentesConAlergias(reservaId: string) {
    const ref = collection(db, 'reservas', reservaId, 'asistencias');
    const snap = await getDocs(ref);
    const conAlergias: AsistenciaDetalle[] = [];
    snap.docs.forEach((docItem) => {
      const data = AsistenciaDocSchema.parse(docItem.data());
      let tieneAlergias = false;
      const alergias = data.alergias;
      if (Array.isArray(alergias) ? alergias.length > 0 : !!alergias && alergias.trim().length > 0) {
        tieneAlergias = true;
      }
      if (!tieneAlergias && data.invitados?.length) {
        data.invitados.forEach((inv) => {
          const alergiasInv = inv.alergias;
          if (Array.isArray(alergiasInv) ? alergiasInv.length > 0 : !!alergiasInv && alergiasInv.trim().length > 0) {
            tieneAlergias = true;
          }
        });
      }
      if (tieneAlergias) conAlergias.push({ id: docItem.id, ...data });
    });
    return conAlergias;
  }

  static async getAsistencias(reservaId: string) {
    const ref = collection(db, 'reservas', reservaId, 'asistencias');
    const snap = await getDocs(ref);
    return snap.docs.map((docItem) => ({ id: docItem.id, ...AsistenciaDocSchema.parse(docItem.data()) }));
  }

  static async getConteoAsistentes(reservaId: string, tipoCompra?: string | null) {
    const ref = collection(db, 'reservas', reservaId, 'asistencias');
    const snap = await getDocs(ref);
    const esEntradas = (tipoCompra ?? '').toLowerCase() === 'entradas';

    let totalAsistentes = 0;
    let confirmados = 0;
    let confirmadosNoPagados = 0;
    let pagados = 0;
    let talvez = 0;
    let noAsisten = 0;

    snap.docs.forEach((docItem) => {
      const data = AsistenciaDocSchema.parse(docItem.data());
      const tipoAsistencia = (data.tipoAsistencia || 'si').toLowerCase();
      const tienePago = !!data.paymentIntentId;
      const invitados = data.invitados ?? [];

      if (tipoAsistencia === 'no') {
        noAsisten += 1;
      } else {
        totalAsistentes += 1;
        if (esEntradas) {
          if (tipoAsistencia === 'si') {
            if (tienePago) {
              confirmados += 1;
              pagados += 1;
            } else {
              confirmadosNoPagados += 1;
            }
          } else if (tipoAsistencia === 'talvez') {
            talvez += 1;
          }
        } else {
          if (tipoAsistencia === 'si') confirmados += 1;
          if (tipoAsistencia === 'talvez') talvez += 1;
        }
      }

      invitados.forEach((inv) => {
        const tipoInv = (inv.tipoAsistencia || tipoAsistencia).toLowerCase();
        if (tipoInv === 'no') {
          noAsisten += 1;
        } else {
          totalAsistentes += 1;
          if (esEntradas) {
            if (tipoInv === 'si') {
              if (tienePago) {
                confirmados += 1;
                pagados += 1;
              } else {
                confirmadosNoPagados += 1;
              }
            } else if (tipoInv === 'talvez') {
              talvez += 1;
            }
          } else {
            if (tipoInv === 'si') confirmados += 1;
            if (tipoInv === 'talvez') talvez += 1;
          }
        }
      });
    });

    return {
      totalAsistentes,
      confirmados,
      confirmadosNoPagados,
      pagados,
      talvez,
      noAsisten,
    };
  }

  static async getFacturas(reservaId: string) {
    const ref = collection(db, 'reservas', reservaId, 'facturasUsuarios');
    const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')));
    const facturas = snap.docs.map((docItem) => ({ id: docItem.id, ...FacturaDocSchema.parse(docItem.data()) }));
    const visibles = facturas.filter((factura) => factura.tipo !== 'usuario_comision');
    return { facturas, visibles };
  }

  static async addNota(reservaId: string, contenido: string) {
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const notas = (data.notasReserva as unknown[]) ?? [];
    const nueva = { contenido, fechaCreacion: Timestamp.now(), autor: 'Partner', x: null, y: null };
    await updateDoc(ref, { notasReserva: [...notas, nueva] });
  }

  static async updateNota(reservaId: string, index: number, contenido: string) {
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const notas = (data.notasReserva as NotaDetalle[]) ?? [];
    if (index < 0 || index >= notas.length) return;
    const updated = [...notas];
    updated[index] = { ...updated[index], contenido, fechaActualizacion: Timestamp.now() };
    await updateDoc(ref, { notasReserva: updated });
  }

  static async updateNotaPosition(reservaId: string, index: number, position: { x: number; y: number }) {
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const notas = (data.notasReserva as NotaDetalle[]) ?? [];
    if (index < 0 || index >= notas.length) return;
    const updated = [...notas];
    updated[index] = { ...updated[index], x: position.x, y: position.y, fechaActualizacion: Timestamp.now() };
    await updateDoc(ref, { notasReserva: updated });
  }

  static async updateNotasPositions(
    reservaId: string,
    notas: Array<{ x: number | null; y: number | null } & Record<string, unknown>>
  ) {
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await updateDoc(ref, { notasReserva: notas });
  }

  static async updateReservaQuestions(
    reservaId: string,
    questions: Array<{
      question: string;
      question_type: 'string' | 'choice' | 'boolean';
      required: boolean;
      options?: string[];
    }>
  ) {
    const ref = doc(db, 'reservas', reservaId);
    const cleaned = questions
      .filter((q) => q.question.trim())
      .map((q) => {
        const base = {
          question: q.question.trim(),
          question_type: q.question_type,
          required: Boolean(q.required),
        } as {
          question: string;
          question_type: 'string' | 'choice' | 'boolean';
          required: boolean;
          options?: string[];
        };
        if (q.question_type === 'choice') {
          const opts = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
          if (opts.length) base.options = opts;
        }
        return base;
      });

    await updateDoc(ref, { questions: cleaned.length ? cleaned : deleteField() });
  }

  static async deleteNota(reservaId: string, index: number) {
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const notas = (data.notasReserva as NotaDetalle[]) ?? [];
    if (index < 0 || index >= notas.length) return;
    const updated = [...notas];
    updated.splice(index, 1);
    await updateDoc(ref, { notasReserva: updated });
  }

  static async addEtiqueta(reservaId: string, etiqueta: { texto: string; color: number }) {
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const etiquetas = (data.etiquetas as unknown[]) ?? [];
    const nueva = { nombre: etiqueta.texto, texto: etiqueta.texto, color: etiqueta.color, fechaCreacion: Timestamp.now() };
    await updateDoc(ref, { etiquetas: [...etiquetas, nueva] });
  }

  static async updateEtiquetaColor(reservaId: string, index: number, color: number) {
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const etiquetas = (data.etiquetas as EtiquetaDetalle[]) ?? [];
    if (index < 0 || index >= etiquetas.length) return;
    const updated = [...etiquetas];
    updated[index] = { ...updated[index], color };
    await updateDoc(ref, { etiquetas: updated });
  }

  static async updateEtiquetaTexto(reservaId: string, index: number, texto: string) {
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const etiquetas = (data.etiquetas as EtiquetaDetalle[]) ?? [];
    if (index < 0 || index >= etiquetas.length) return;
    const updated = [...etiquetas];
    updated[index] = { ...updated[index], texto, nombre: texto };
    await updateDoc(ref, { etiquetas: updated });
  }

  static async deleteEtiqueta(reservaId: string, index: number) {
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const etiquetas = (data.etiquetas as EtiquetaDetalle[]) ?? [];
    if (index < 0 || index >= etiquetas.length) return;
    const updated = [...etiquetas];
    updated.splice(index, 1);
    await updateDoc(ref, { etiquetas: updated });
  }

  static async updateEstado(params: {
    reservaId: string;
    estado: string;
    pagado?: boolean;
    tipoCompra?: string | null;
  }) {
    const ref = doc(db, 'reservas', params.reservaId);
    const update: Record<string, unknown> = {
      estado: params.estado,
      fechaActualizacion: Timestamp.now(),
    };
    if (params.estado === 'aceptado') {
      if (params.pagado !== undefined) update.pagado = params.pagado;
      if (params.pagado === true && params.tipoCompra) update.tipoCompra = params.tipoCompra;
      if (params.pagado === false) update.tipoCompra = deleteField();
    }
    await updateDoc(ref, update);
  }

  static async aceptarCambioReserva(params: { reservaId: string; fechaLimitePago: string }) {
    const { reservaId, fechaLimitePago } = params;
    if (!reservaId) return;
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const cambio = data.cambioSolicitado as
      | {
          aforoNuevo?: number;
          fechaNueva?: string;
          horaNueva?: string;
          horaFinNueva?: string;
        }
      | undefined;
    const komboCurrent = (data.kombo as Record<string, unknown>) ?? {};
    const sizeCurrent = (komboCurrent['Tamaño del grupo'] as Record<string, unknown>) ?? {};

    const nextKombo: Record<string, unknown> = {
      ...komboCurrent,
    };
    if (cambio?.fechaNueva) nextKombo.Fecha = cambio.fechaNueva;
    if (cambio?.horaNueva) nextKombo.Hora = cambio.horaNueva;
    if (cambio?.horaFinNueva) nextKombo.horaFin = cambio.horaFinNueva;
    if (typeof cambio?.aforoNuevo === 'number') {
      nextKombo['Tamaño del grupo'] = {
        ...sizeCurrent,
        max: cambio.aforoNuevo,
      };
    }

    await updateDoc(ref, {
      kombo: nextKombo,
      estado: 'aceptado',
      cambioSolicitado: deleteField(),
      fechaLimitePago,
      fechaLimiteSala: fechaLimitePago,
      fechaLimiteAsistentes: fechaLimitePago,
      fechaActualizacion: Timestamp.now(),
    });

    const clienteId = (data.usuario as { id?: string } | undefined)?.id ?? null;
    const clienteEmail =
      (data.usuario as { email?: string } | undefined)?.email ??
      (data as { clienteEmail?: string } | undefined)?.clienteEmail ??
      null;
    const { email } = await this.getClienteDatos({
      reservaId,
      clienteId,
      clienteEmail,
    });
    if (email) {
      await this.sendCambioEstadoEmail({
        reservaId,
        email,
        accepted: true,
      });
    }
  }

  static async rechazarCambioReserva(params: { reservaId: string }) {
    const { reservaId } = params;
    if (!reservaId) return;
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;

    await updateDoc(ref, {
      estado: 'cambioRechazado',
      fechaActualizacion: Timestamp.now(),
    });

    const clienteId = (data.usuario as { id?: string } | undefined)?.id ?? null;
    const clienteEmail =
      (data.usuario as { email?: string } | undefined)?.email ??
      (data as { clienteEmail?: string } | undefined)?.clienteEmail ??
      null;
    const { email } = await this.getClienteDatos({
      reservaId,
      clienteId,
      clienteEmail,
    });
    if (email) {
      await this.sendCambioEstadoEmail({
        reservaId,
        email,
        accepted: false,
      });
    }
  }

  static async confirmarReservaExpirada(params: { reservaId: string }) {
    const { reservaId } = params;
    if (!reservaId) return;
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;

    await updateDoc(ref, {
      estado: 'aceptado',
      fechaActualizacion: Timestamp.now(),
    });

    const clienteId = (data.usuario as { id?: string } | undefined)?.id ?? null;
    const clienteEmail =
      (data.usuario as { email?: string } | undefined)?.email ??
      (data as { clienteEmail?: string } | undefined)?.clienteEmail ??
      null;
    const { email } = await this.getClienteDatos({
      reservaId,
      clienteId,
      clienteEmail,
    });
    if (email) {
      await this.sendExpiradaEstadoEmail({
        reservaId,
        email,
        confirmed: true,
      });
      return { emailSent: true, missingUser: false };
    }
    return { emailSent: false, missingUser: true };
  }

  static async cancelarReservaExpirada(params: { reservaId: string }) {
    const { reservaId } = params;
    if (!reservaId) return;
    const ref = doc(db, 'reservas', reservaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;

    await updateDoc(ref, {
      estado: 'fallado',
      fechaActualizacion: Timestamp.now(),
    });

    const clienteId = (data.usuario as { id?: string } | undefined)?.id ?? null;
    const clienteEmail =
      (data.usuario as { email?: string } | undefined)?.email ??
      (data as { clienteEmail?: string } | undefined)?.clienteEmail ??
      null;
    const { email } = await this.getClienteDatos({
      reservaId,
      clienteId,
      clienteEmail,
    });
    if (email) {
      await this.sendExpiradaEstadoEmail({
        reservaId,
        email,
        confirmed: false,
      });
      return { emailSent: true, missingUser: false };
    }
    return { emailSent: false, missingUser: true };
  }

  static async updateFechaLimitePago(params: {
    reservaId: string;
    fechaLimitePago: string;
    usuarioId?: string | null;
    usuarioEmail?: string | null;
  }) {
    const { reservaId, fechaLimitePago, usuarioId, usuarioEmail } = params;
    console.warn('[updateFechaLimitePago] input', {
      reservaId,
      fechaLimitePago,
      usuarioId,
      usuarioEmail,
    });
    if (!reservaId || !fechaLimitePago) {
      return { emailSent: false, missingUser: true, missingEmail: true };
    }

    const ref = doc(db, 'reservas', reservaId);
    await updateDoc(ref, {
      fechaLimitePago,
      fechaLimiteSala: fechaLimitePago,
      fechaLimiteAsistentes: fechaLimitePago,
      fechaActualizacion: Timestamp.now(),
    });

    if (!usuarioId) {
      console.warn('[updateFechaLimitePago] missing usuarioId, trying fallback email', {
        usuarioEmail,
      });
      if (usuarioEmail) {
        return await this.sendFechaLimiteEmail({
          reservaId,
          fechaLimitePago,
          email: usuarioEmail,
        });
      }
      return { emailSent: false, missingUser: true, missingEmail: true };
    }

    const userDoc = await getDoc(doc(db, 'users', usuarioId));
    if (!userDoc.exists()) {
      console.warn('[updateFechaLimitePago] user doc not found, trying fallback email', {
        usuarioId,
        usuarioEmail,
      });
      if (usuarioEmail) {
        return await this.sendFechaLimiteEmail({
          reservaId,
          fechaLimitePago,
          email: usuarioEmail,
        });
      }
      return { emailSent: false, missingUser: true, missingEmail: true };
    }

    const userData = userDoc.data() as Record<string, unknown>;
    const email =
      (userData.Email as string | undefined) ??
      (userData.email as string | undefined) ??
      usuarioEmail ??
      '';

    if (!email) {
      console.warn('[updateFechaLimitePago] missing email after lookup', {
        usuarioId,
        usuarioEmail,
        userDataKeys: Object.keys(userData),
      });
      return { emailSent: false, missingUser: false, missingEmail: true };
    }

    return await this.sendFechaLimiteEmail({ reservaId, fechaLimitePago, email });
  }

  static async updateReservaRestauranteSala(params: {
    reservaId: string;
    restauranteId: string;
    salaNombre?: string;
    salaCustom?: { nombre: string; aforoMinimo?: number; aforoMaximo?: number };
  }) {
    const { reservaId, restauranteId, salaNombre, salaCustom } = params;
    if (!reservaId || !restauranteId || (!salaNombre && !salaCustom)) return;

    const restauranteSnap = await getDoc(doc(db, 'restaurants', restauranteId));
    if (!restauranteSnap.exists()) {
      throw new Error('Restaurante no encontrado');
    }

    const restauranteParsed = RestauranteDetalleDocSchema.parse(restauranteSnap.data());
    let sala =
      salaCustom != null
        ? {
            nombre: salaCustom.nombre,
            descripcion: '',
            aforoMinimo: salaCustom.aforoMinimo ?? 0,
            aforoMaximo: salaCustom.aforoMaximo ?? 0,
            permiteReservaSinCompraAnticipada: true,
            precioPrivatizacion: 0,
            caracteristicas: {},
          }
        : undefined;
    if (!sala) {
      const salaFound = (restauranteParsed.salas ?? []).find((item) => item.nombre === salaNombre);
      if (!salaFound) {
        throw new Error('Sala no encontrada');
      }
      sala = {
        ...salaFound,
        aforoMinimo: Number(salaFound.aforoMinimo ?? 0),
        aforoMaximo: Number(salaFound.aforoMaximo ?? 0),
        precioPrivatizacion: Number(salaFound.precioPrivatizacion ?? 0),
        caracteristicas: salaFound.caracteristicas ?? {},
      };
    }

    const restaurantePayload = {
      id: restauranteId,
      slug: restauranteParsed.slug ?? '',
      'Nombre del restaurante': restauranteParsed['Nombre del restaurante'] ?? '',
      horaCierre: restauranteParsed.horaCierre ?? '',
      Ubicación: restauranteParsed.Ubicación ?? restauranteParsed.Ubicacion ?? '',
      'Dirección': restauranteParsed['Dirección'] ?? restauranteParsed['Direccion'] ?? '',
      'Código Postal': restauranteParsed['Código Postal'] ?? restauranteParsed['Codigo Postal'] ?? '',
      'Imagenes del restaurante': restauranteParsed['Imagenes del restaurante'] ?? [],
    };

    const ref = doc(db, 'reservas', reservaId);
    await updateDoc(ref, {
      restaurante: restaurantePayload,
      sala,
      fechaActualizacion: new Date(),
    });

    await this.sendReservaUpdateEmail({
      reservaId,
      subject: 'Reserva actualizada',
      intro: 'El restaurante ha actualizado el local o el espacio de tu reserva.',
      changes: [
        `Nuevo restaurante: ${restaurantePayload['Nombre del restaurante'] ?? '—'}`,
        `Nuevo espacio: ${sala?.nombre ?? '—'}`,
      ],
    });
  }

  static async updateReservaPack(params: { reservaId: string; pack: PackCatalogItem; precio?: Record<string, unknown> }) {
    const { reservaId, pack, precio } = params;
    if (!reservaId) return;
    const ref = doc(db, 'reservas', reservaId);
    const payload: Record<string, unknown> = {
      pack,
      fechaActualizacion: new Date(),
    };
    if (precio) payload.precio = precio;
    await updateDoc(ref, payload);

    await this.sendReservaUpdateEmail({
      reservaId,
      subject: 'Reserva actualizada',
      intro: 'El restaurante ha actualizado el plan de tu reserva.',
      changes: [`Nuevo plan: ${pack?.['Nombre del pack'] ?? '—'}`],
    });
  }

  static async updateReservaEvento(params: {
    reservaId: string;
    kombo: Record<string, unknown>;
  }) {
    const { reservaId, kombo } = params;
    if (!reservaId) return;
    const ref = doc(db, 'reservas', reservaId);
    await updateDoc(ref, {
      kombo,
      fechaActualizacion: Timestamp.now(),
    });

    const fecha = (kombo as Record<string, unknown>)?.Fecha ?? '';
    const hora = (kombo as Record<string, unknown>)?.Hora ?? '';
    const horaFin = (kombo as Record<string, unknown>)?.horaFin ?? '';
    const grupo = (kombo as Record<string, unknown>)?.['Tamaño del grupo'] as Record<string, unknown> | undefined;
    const aforoMin = grupo?.min ?? '';
    const aforoMax = grupo?.max ?? '';
    await this.sendReservaUpdateEmail({
      reservaId,
      subject: 'Reserva actualizada',
      intro: 'El restaurante ha actualizado los detalles de tu reserva.',
      changes: [
        `Fecha: ${fecha || '—'}`,
        `Horario: ${hora || '—'}${horaFin ? ` - ${horaFin}` : ''}`,
        `Aforo: ${aforoMin || '—'} - ${aforoMax || '—'}`,
      ],
    });
  }

  static async updateReservaResponsable(params: {
    reservaId: string;
    responsableEquipo: { id: string; nombre: string; email?: string; role?: string } | null;
  }) {
    const { reservaId, responsableEquipo } = params;
    if (!reservaId) return;
    const ref = doc(db, 'reservas', reservaId);
    await updateDoc(ref, {
      responsableEquipo: responsableEquipo ?? null,
      fechaActualizacion: Timestamp.now(),
    });
  }

  static async hasAsistenciasPagadas(reservaId: string) {
    if (!reservaId) return false;
    const ref = collection(db, 'reservas', reservaId, 'asistencias');
    const snap = await getDocs(query(ref, where('paymentIntentId', '>', ''), limit(1)));
    return snap.docs.length > 0;
  }

  private static async sendFechaLimiteEmail(params: {
    reservaId: string;
    fechaLimitePago: string;
    email: string;
  }) {
    const { reservaId, fechaLimitePago, email } = params;
    if (MAIL_ENDPOINT && WEB_URL) {
      const manageUrl = `${WEB_URL}/plan/${reservaId}/gestionar`;
      const logoUrl = `${WEB_URL}/komvo/logotipo-black.png`;
      const { subject, htmlContent } = buildFechaLimiteEmail({ fechaLimitePago, manageUrl, logoUrl });

      await fetch(MAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: email,
          subject,
          htmlContent,
        }),
      });
    }

    return { emailSent: true, missingUser: false, missingEmail: false };
  }

  private static async sendCambioEstadoEmail(params: {
    reservaId: string;
    email: string;
    accepted: boolean;
  }) {
    const { reservaId, email, accepted } = params;
    if (MAIL_ENDPOINT && WEB_URL) {
      const manageUrl = `${WEB_URL}/plan/${reservaId}/gestionar`;
      const logoUrl = `${WEB_URL}/komvo/logotipo-black.png`;
      const { subject, htmlContent } = buildCambioEstadoEmail({ accepted, manageUrl, logoUrl });

      await fetch(MAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: email,
          subject,
          htmlContent,
        }),
      });
    }
  }

  private static async sendExpiradaEstadoEmail(params: {
    reservaId: string;
    email: string;
    confirmed: boolean;
  }) {
    const { reservaId, email, confirmed } = params;
    if (MAIL_ENDPOINT && WEB_URL) {
      const manageUrl = `${WEB_URL}/plan/${reservaId}/gestionar`;
      const logoUrl = `${WEB_URL}/komvo/logotipo-black.png`;
      const { subject, htmlContent } = buildExpiradaEstadoEmail({ confirmed, manageUrl, logoUrl });

      await fetch(MAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: email,
          subject,
          htmlContent,
        }),
      });
    }
  }

  private static async sendReservaUpdateEmail(params: {
    reservaId: string;
    subject: string;
    intro: string;
    changes: string[];
  }) {
    const { reservaId, subject, intro, changes } = params;
    if (!MAIL_ENDPOINT || !WEB_URL) return { emailSent: false, missingUser: false, missingEmail: true };
    const { email } = await this.getClienteDatos({ reservaId });
    if (!email) return { emailSent: false, missingUser: false, missingEmail: true };
    const manageUrl = `${WEB_URL}/plan/${reservaId}/gestionar`;
    const logoUrl = `${WEB_URL}/komvo/logotipo-black.png`;
    const emailTemplate = buildReservaUpdateEmail({ subject, intro, changes, manageUrl, logoUrl });

    await fetch(MAIL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail: email,
        subject: emailTemplate.subject,
        htmlContent: emailTemplate.htmlContent,
      }),
    });
    return { emailSent: true, missingUser: false, missingEmail: false };
  }

  static async sendReservaManageEmail(params: { reservaId: string; email: string }) {
    const { reservaId, email } = params;
    if (MAIL_ENDPOINT && WEB_URL) {
      const manageUrl = `${WEB_URL}/plan/${reservaId}/gestionar`;
      const logoUrl = `${WEB_URL}/komvo/logotipo-black.png`;
      const { subject, htmlContent } = buildReservaManageEmail({ manageUrl, logoUrl });

      await fetch(MAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: email,
          subject,
          htmlContent,
        }),
      });
    }
  }
}
