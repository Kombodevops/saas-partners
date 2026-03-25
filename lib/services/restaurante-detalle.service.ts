import { Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { RestauranteDetalleDocSchema } from '@/lib/validators/restaurante-detalle';
import type { RestauranteDetalleDoc } from '@/lib/validators/restaurante-detalle';
import type { RestauranteGeneralForm } from '@/lib/validators/restaurante-general';
import type { RestauranteHorarioForm } from '@/lib/validators/restaurante-horario';
import type { RestauranteResponsableForm } from '@/lib/validators/restaurante-responsable';
import type { RestauranteSalasForm } from '@/lib/validators/restaurante-salas';
import type { RestauranteBarraForm } from '@/lib/validators/restaurante-barra';
import type { RestauranteExtrasForm } from '@/lib/validators/restaurante-extras';
import type { RestauranteRacionesForm } from '@/lib/validators/restaurante-raciones';
import type { RestauranteFiscalForm } from '@/lib/validators/restaurante-fiscal';
import { slugify } from '@/lib/utils/slugify';
import { buildCaracteristicasDerived } from '@/lib/utils/caracteristicas';
import { buildSearchQueries } from '@/lib/utils/search-queries';

export class RestauranteDetalleService {
  static async getRestauranteById(id: string): Promise<RestauranteDetalleDoc | null> {
    if (!id) return null;
    const ref = doc(db, 'restaurants', id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    return RestauranteDetalleDocSchema.parse(snapshot.data());
  }

  static async updateInformacionGeneral(id: string, payload: RestauranteGeneralForm): Promise<void> {
    if (!id) return;
    const ref = doc(db, 'restaurants', id);
    await updateDoc(ref, {
      'Nombre del restaurante': payload.nombre,
      slug: slugify(payload.nombre),
      'Descripción': payload.descripcion,
      'Dirección': payload.direccion,
      'Código Postal': payload.codigoPostal,
      'Ciudad': payload.ciudad,
      'Ubicación': payload.ubicacion,
      'Tipo de cocina': payload.tipoCocina,
      'Número de teléfono': payload.telefono,
      presupuesto: payload.presupuesto,
      aforo: {
        min: payload.aforoMin,
        max: payload.aforoMax,
      },
      searchQueries: buildSearchQueries([
        payload.nombre,
        payload.direccion,
        payload.ciudad,
        payload.codigoPostal,
        payload.ubicacion,
      ]),
    });
  }

  static async updateColor(id: string, color: string): Promise<void> {
    if (!id) return;
    const ref = doc(db, 'restaurants', id);
    await updateDoc(ref, { color });
  }

  static async updateHorario(id: string, payload: RestauranteHorarioForm): Promise<void> {
    if (!id) return;
    const horario: Record<string, { cerrado: boolean; intervalos: { horaInicio: Timestamp; horaFin: Timestamp }[] }> = {};
    const baseDate = new Date(2023, 0, 1);

    Object.entries(payload.dias).forEach(([dia, value]) => {
      horario[dia] = {
        cerrado: value.cerrado,
        intervalos: value.intervalos.map((intervalo) => {
          const [startH, startM] = intervalo.horaInicio.split(':').map(Number);
          const [endH, endM] = intervalo.horaFin.split(':').map(Number);

          const startDate = new Date(baseDate);
          startDate.setHours(startH ?? 0, startM ?? 0, 0, 0);

          const endDate = new Date(baseDate);
          endDate.setHours(endH ?? 0, endM ?? 0, 0, 0);

          return {
            horaInicio: Timestamp.fromDate(startDate),
            horaFin: Timestamp.fromDate(endDate),
          };
        }),
      };
    });

    const ref = doc(db, 'restaurants', id);
    await updateDoc(ref, { horario });
  }

  static async updateResponsable(id: string, payload: RestauranteResponsableForm): Promise<void> {
    if (!id) return;
    const ref = doc(db, 'restaurants', id);
    await updateDoc(ref, {
      responsable: {
        nombre: payload.nombre,
        telefono: payload.telefono,
      },
    });
  }

  static async updateCaracteristicas(id: string, caracteristicas: Record<string, string>): Promise<void> {
    if (!id) return;
    const { caracteristicasBool, caracteristicasList } = buildCaracteristicasDerived(caracteristicas);
    const ref = doc(db, 'restaurants', id);
    await updateDoc(ref, {
      caracteristicas,
      caracteristicasBool,
      caracteristicasList,
    });
  }

  static async updateSalas(id: string, payload: RestauranteSalasForm): Promise<void> {
    if (!id) return;
    const ref = doc(db, 'restaurants', id);
    const snap = await getDoc(ref);
    const current = snap.exists()
      ? ((snap.data() as { plans_included?: unknown })?.plans_included ?? [])
      : [];
    const currentList = Array.isArray(current)
      ? current.filter((item): item is string => typeof item === 'string')
      : [];
    const base = currentList.filter((item) => item !== 'consumo_libre');
    const hasConsumoLibre = payload.salas.some((sala) => sala.permiteReservaSinCompraAnticipada);
    const nextPlans = hasConsumoLibre ? Array.from(new Set([...base, 'consumo_libre'])) : base;
    await updateDoc(ref, {
      salas: payload.salas,
      plans_included: nextPlans,
    });
  }

  static async updateConsumicionesBarra(id: string, payload: RestauranteBarraForm): Promise<void> {
    if (!id) return;
    const ref = doc(db, 'restaurants', id);
    await updateDoc(ref, {
      consumicionesBarra: payload.consumiciones,
    });
  }

  static async updateExtras(id: string, payload: RestauranteExtrasForm): Promise<void> {
    if (!id) return;
    const ref = doc(db, 'restaurants', id);
    const normalizedExtras = (payload.extras ?? []).map((extra) => {
      const base = {
        nombre: extra.nombre ?? '',
        descripcion: extra.descripcion ?? '',
        precio: Number(extra.precio ?? 0),
        tipoPrecio: extra.tipoPrecio ?? 'fijo',
      } as Record<string, unknown>;
      if (extra.tipoPrecio === 'porHora') {
        base.tiempoMinimoHoras = extra.tiempoMinimoHoras ?? 1;
        base.tipoIncremento = extra.tipoIncremento ?? 'porHora';
      }
      if (extra.tipoPrecio === 'porUnidad') {
        base.unidadesMinimas = extra.unidadesMinimas ?? 1;
      }
      return base;
    });
    await updateDoc(ref, {
      extras: normalizedExtras,
    });
  }

  static async updateRaciones(id: string, payload: RestauranteRacionesForm): Promise<void> {
    if (!id) return;
    const ref = doc(db, 'restaurants', id);
    await updateDoc(ref, {
      raciones: payload.raciones,
    });
  }

  static async updateAbierto(id: string, abierto: boolean): Promise<void> {
    if (!id) return;
    const ref = doc(db, 'restaurants', id);
    await updateDoc(ref, {
      abierto,
    });
  }

  static async updateDatosFiscales(id: string, payload: RestauranteFiscalForm): Promise<void> {
    if (!id) return;
    const ref = doc(db, 'restaurants', id);
    await updateDoc(ref, {
      datos_personales: {
        Email: payload.email ?? '',
        Prefijo: payload.prefijo ?? '',
        'Número de teléfono': payload.telefono ?? '',
        'Fecha de nacimiento': payload.fechaNacimiento ?? '',
        Dirección: payload.direccion ?? '',
        Ciudad: payload.ciudad ?? '',
        CP: payload.cp ?? '',
        nombre: payload.nombre ?? '',
        Apellidos: payload.apellidos ?? '',
      },
      datos_fiscales: {
        isBusiness: payload.businessType === 'empresa',
        'Razón social': payload.razonSocial ?? '',
        NIF: payload.nif ?? '',
        'Dirección Fiscal': payload.direccionFiscal ?? '',
        'Código Postal del negocio': payload.codigoPostalNegocio ?? '',
        'Ciudad del negocio': payload.ciudadNegocio ?? '',
        'Provincia del negocio': payload.provinciaNegocio ?? '',
        'Teléfono del negocio': payload.telefonoNegocio ?? '',
        contrato: payload.contrato ?? '',
      },
      datos_bancarios: {
        'Numero de cuenta': payload.numeroCuenta ?? '',
        'Nombre y apellidos del titular de la cuenta': payload.nombreTitular ?? '',
        'Nombre del banco': payload.nombreBanco ?? '',
      },
      stripeAccountId: payload.stripeAccountId ?? '',
    });
  }

  static async uploadDni(
    id: string,
    payload: { front: File; back: File }
  ): Promise<{ dnifUrl: string; dnibUrl: string }> {
    const upload = async (file: File, type: 'DNIF' | 'DNIB') => {
      const safeName = file.name.replace(/\s+/g, '_');
      const path = `restaurants/${id}/${type}/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    };

    const [dnifUrl, dnibUrl] = await Promise.all([upload(payload.front, 'DNIF'), upload(payload.back, 'DNIB')]);
    const refDoc = doc(db, 'restaurants', id);
    await updateDoc(refDoc, {
      DNIF: {
        DNIF: {
          url: dnifUrl,
          nombrePDF: payload.front.name,
          subidoExitosamente: true,
        },
      },
      DNIB: {
        DNIB: {
          url: dnibUrl,
          nombrePDF: payload.back.name,
          subidoExitosamente: true,
        },
      },
    });

    return { dnifUrl, dnibUrl };
  }
}
