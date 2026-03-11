import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buildReservaEstadoEmail } from '@/lib/emails/reservas';

const MAIL_ENDPOINT = process.env.NEXT_PUBLIC_SEND_MAIL_URL ?? '';
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? '';

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
  private static getString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private static getReservaSnapshot = async (reservaId: string) => {
    const snap = await getDoc(doc(db, 'reservas', reservaId));
    if (!snap.exists()) return null;
    return snap.data() as Record<string, unknown>;
  };

  private static buildManageUrl(reservaId: string) {
    return `${WEB_URL}/plan/${reservaId}/gestionar`;
  }

  private static async sendReservaEstadoEmail(params: {
    reservaId: string;
    accepted: boolean;
    motivo?: string;
  }) {
    if (!MAIL_ENDPOINT || !WEB_URL) return;
    const data = await this.getReservaSnapshot(params.reservaId);
    if (!data) return;
    const usuario = (data.usuario as Record<string, unknown> | undefined) ?? {};
    const email = this.getString(usuario.Email ?? usuario.email);
    if (!email) return;
    const restaurante = (data.restaurante as Record<string, unknown> | undefined) ?? {};
    const sala = (data.sala as Record<string, unknown> | undefined) ?? {};
    const kombo = (data.kombo as Record<string, unknown> | undefined) ?? {};
    const pack = (data.pack as Record<string, unknown> | undefined) ?? {};
    const manageUrl = this.buildManageUrl(params.reservaId);
    const logoUrl = `${WEB_URL}/komvo/logotipo-black.png`;
    const { subject, htmlContent } = buildReservaEstadoEmail({
      accepted: params.accepted,
      manageUrl,
      motivo: params.motivo,
      logoUrl,
      data: {
        restauranteNombre: this.getString(restaurante['Nombre del restaurante']),
        salaNombre: this.getString(sala.nombre),
        planNombre: this.getString(pack['Nombre del pack']),
        fecha: this.getString(kombo.Fecha),
        horaInicio: this.getString(kombo.Hora),
        horaFin: this.getString(kombo.horaFin),
      },
    });
    void fetch(MAIL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail: email,
        subject,
        htmlContent,
      }),
    }).catch((error) => {
      console.error('[sendReservaEstadoEmail] failed', error);
    });
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
    await updateDoc(ref, payload);
    void this.sendReservaEstadoEmail({ reservaId, accepted: true });
  }

  static async rechazarReserva({ reservaId, motivo }: RechazarReservaPayload) {
    if (!reservaId || !motivo) return;
    const ref = doc(db, 'reservas', reservaId);
    await updateDoc(ref, {
      estado: 'fallado',
      motivo,
      fechaActualizacion: serverTimestamp(),
    });
    void this.sendReservaEstadoEmail({ reservaId, accepted: false, motivo });
  }
}
