import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const RESEND_ENDPOINT = process.env.NEXT_PUBLIC_SEND_RESEND_EMAIL ?? '';

type QuestionPayload = {
  question: string;
  question_type: 'string' | 'choice' | 'boolean';
  required: boolean;
  options?: string[];
};

type AceptarReservaPayload = {
  reservaId: string;
  fechaLimitePago?: string;
  fechaLimiteAsistentes?: string;
  anticipoDescripcion?: string;
  anticipoPrecio?: number;
  questions?: QuestionPayload[];
};

type RechazarReservaPayload = {
  reservaId: string;
  motivo: string;
};

export class ReservaActionsService {
  private static stripUndefinedDeep(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.stripUndefinedDeep(item))
        .filter((item) => item !== undefined);
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const next: Record<string, unknown> = {};
      Object.keys(record).forEach((key) => {
        const v = record[key];
        if (v === undefined) return;
        next[key] = this.stripUndefinedDeep(v);
      });
      return next;
    }
    return value;
  }

  private static findUndefinedPaths(value: unknown, prefix = ''): string[] {
    if (value === undefined) return [prefix || '<root>'];
    if (Array.isArray(value)) {
      return value.flatMap((item, idx) => this.findUndefinedPaths(item, `${prefix}[${idx}]`));
    }
    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).flatMap(([key, v]) =>
        this.findUndefinedPaths(v, prefix ? `${prefix}.${key}` : key)
      );
    }
    return [];
  }

  private static getString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private static getReservaSnapshot = async (reservaId: string) => {
    const snap = await getDoc(doc(db, 'reservas', reservaId));
    if (!snap.exists()) return null;
    return snap.data() as Record<string, unknown>;
  };

  private static async enviarEmailReserva(reservaId: string, templateKey: string) {
    if (!RESEND_ENDPOINT) return;
    try {
      const data = await this.getReservaSnapshot(reservaId);
      const usuario = (data?.usuario as Record<string, unknown> | undefined) ?? {};
      const isApp = Boolean(usuario?.isApp);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      void fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            reservaId,
            templateKey,
            isApp,
          },
        }),
      }).catch((error) => console.error('[enviarEmailReserva] failed', error));
    } catch (error) {
      console.error('[enviarEmailReserva] failed', error);
    }
  }

  static async aceptarReserva({
    reservaId,
    fechaLimitePago,
    fechaLimiteAsistentes,
    anticipoDescripcion,
    anticipoPrecio,
    questions,
  }: AceptarReservaPayload) {
    if (!reservaId) return;
    if (!fechaLimitePago && !fechaLimiteAsistentes) return;
    const ref = doc(db, 'reservas', reservaId);
    const resolvedFechaPago = fechaLimitePago ?? fechaLimiteAsistentes ?? null;
    const resolvedFechaAsistentes = fechaLimiteAsistentes ?? fechaLimitePago ?? null;
    const payload: Record<string, unknown> = {
      estado: 'pendienteGestion',
      estadoSala: 'activa',
      pagado: false,
      fechaLimitePago: resolvedFechaPago,
      fechaLimiteAsistentes: resolvedFechaAsistentes,
      fechaLimiteSala: resolvedFechaPago,
      fechaActualizacion: serverTimestamp(),
    };
    if (anticipoDescripcion && anticipoPrecio != null) {
      payload['precio.Anticipo'] = {
        'Descripción': anticipoDescripcion,
        Precio: anticipoPrecio,
      };
    }
    if (questions && questions.length > 0) {
      payload.questions = questions;
    }
    const cleanedPayload = this.stripUndefinedDeep(payload) as Record<string, unknown>;
    const undefinedPaths = this.findUndefinedPaths(cleanedPayload);
    if (undefinedPaths.length > 0) {
      console.error('[aceptarReserva] payload contains undefined', { reservaId, undefinedPaths });
    }
    try {
      await updateDoc(ref, cleanedPayload);
    } catch (error) {
      console.error('[aceptarReserva] updateDoc failed', { reservaId, error });
      throw error;
    }
    void this.enviarEmailReserva(reservaId, 'cliente_pendiente_confirmacion_24h');
  }

  static async rechazarReserva({ reservaId, motivo }: RechazarReservaPayload) {
    if (!reservaId || !motivo) return;
    const ref = doc(db, 'reservas', reservaId);
    await updateDoc(ref, {
      estado: 'fallado',
      motivo,
      fechaActualizacion: serverTimestamp(),
    });
    void this.enviarEmailReserva(reservaId, 'cliente_solicitud_rechazada');
  }
}
