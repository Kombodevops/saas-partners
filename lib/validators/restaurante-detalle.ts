import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

const TimestampSchema = z.custom<Timestamp>((value) => value instanceof Timestamp, {
  message: 'Expected Firestore Timestamp',
});

const IntervaloSchema = z.object({
  horaInicio: TimestampSchema,
  horaFin: TimestampSchema,
});

const HorarioDiaSchema = z.object({
  cerrado: z.boolean().catch(false),
  intervalos: z.array(IntervaloSchema).catch([]),
});

const HorarioSchema = z.record(z.string(), HorarioDiaSchema).catch({});

const CartaItemSchema = z.object({
  Nombre: z.string().catch(''),
  url: z.string().catch(''),
});

const RacionSchema = z.object({
  nombre: z.string().catch(''),
  descripcion: z.string().catch(''),
  precio: z.union([z.string(), z.number()]).catch(''),
});

const ConsumicionBarraSchema = z.object({
  nombre: z.string().catch(''),
  descripcion: z.string().catch(''),
  precio: z.union([z.string(), z.number()]).catch(0),
});

const ExtraSchema = z.object({
  nombre: z.string().catch(''),
  descripcion: z.string().catch(''),
  precio: z.union([z.string(), z.number()]).catch(0),
  tiempoMinimoHoras: z.union([z.string(), z.number()]).optional().catch(undefined),
  unidadesMinimas: z.union([z.string(), z.number()]).optional().catch(undefined),
  tipoIncremento: z.string().nullable().optional(),
  tipoPrecio: z.string().optional().catch(''),
});

const SalaSchema = z.object({
  nombre: z.string().catch(''),
  descripcion: z.string().catch(''),
  aforoMaximo: z.union([z.string(), z.number()]).catch(0),
  aforoMinimo: z.union([z.string(), z.number()]).catch(0),
  caracteristicas: z.record(z.string(), z.string()).catch({}),
  permiteReservaSinCompraAnticipada: z.boolean().catch(false),
  precioPrivatizacion: z.union([z.string(), z.number()]).catch(0),
});

export const RestauranteDetalleDocSchema = z
  .object({
    'Nombre del restaurante': z.string().catch(''),
    'Dirección': z.string().catch(''),
    'Ubicación': z.string().catch(''),
    'Ciudad': z.string().catch(''),
    'Código Postal': z.string().catch(''),
    'Descripción': z.string().catch(''),
    'Tipo de cocina': z.string().optional().catch(''),
    'Número de teléfono': z.string().catch(''),
    'Logo del restaurante': z.array(z.string()).optional().catch([]),
    'Imagenes del restaurante': z.array(z.string()).optional().catch([]),
    Carta: z.record(z.string(), CartaItemSchema).optional().nullable(),
    horario: HorarioSchema.optional().catch({}),
    aforo: z
      .object({
        min: z.union([z.string(), z.number()]).catch(0),
        max: z.union([z.string(), z.number()]).catch(0),
      })
      .catch({ min: 0, max: 0 }),
    caracteristicas: z.record(z.string(), z.string()).optional().catch({}),
    caracteristicasBool: z.record(z.string(), z.boolean()).optional().catch({}),
    caracteristicasList: z.array(z.string()).optional().catch([]),
    consumicionesBarra: z.array(ConsumicionBarraSchema).optional().catch([]),
    raciones: z.array(RacionSchema).optional().catch([]),
    Raciones: z.array(RacionSchema).optional().catch([]),
    extras: z.array(ExtraSchema).optional().catch([]),
    salas: z.array(SalaSchema).optional().catch([]),
    abierto: z.boolean().optional().catch(false),
    horaCierre: z.string().optional().catch(''),
    idPropietario: z.string().optional().catch(''),
    latitude: z.number().optional().catch(0),
    longitude: z.number().optional().catch(0),
    packs: z.array(z.string()).optional().catch([]),
    presupuesto: z.string().optional().catch(''),
    prioridad: z.union([z.string(), z.number()]).optional().catch(0),
    reservasPendientes: z.union([z.string(), z.number()]).optional().catch(0),
    responsable: z
      .object({
        nombre: z.string().catch(''),
        telefono: z.string().catch(''),
      })
      .optional()
      .catch(undefined),
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
    slug: z.string().optional().catch(''),
    color: z.string().optional().catch(''),
  })
  .passthrough();

export type RestauranteDetalleDoc = z.infer<typeof RestauranteDetalleDocSchema>;
