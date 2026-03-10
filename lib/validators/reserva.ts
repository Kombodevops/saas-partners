import { z } from 'zod';

const TimestampLikeSchema = z.union([
  z.object({ __type__: z.literal('Timestamp'), value: z.string() }),
  z.date(),
  z.string(),
]);

export const ReservaDocSchema = z
  .object({
    fechaLimitePago: z.string().optional().catch(''),
    fechaLimiteSala: z.string().optional().catch(''),
    fechaSolicitud: TimestampLikeSchema.optional().catch(''),
    usuarioRegistrado: z.boolean().optional().catch(false),
    estadoKomvo: z.string().optional().catch(''),
    restaurante: z
      .object({
        id: z.string().optional().catch(''),
        slug: z.string().optional().catch(''),
        'Nombre del restaurante': z.string().optional().catch(''),
        horaCierre: z.string().optional().catch(''),
        Ubicacion: z.string().optional().catch(''),
        Ubicación: z.string().optional().catch(''),
        'Direccion': z.string().optional().catch(''),
        'Dirección': z.string().optional().catch(''),
        'Codigo Postal': z.string().optional().catch(''),
        'Código Postal': z.string().optional().catch(''),
        'Imagenes del restaurante': z.array(z.string()).optional().catch([]),
      })
      .optional()
      .catch({
        id: '',
        slug: '',
        'Nombre del restaurante': '',
        horaCierre: '',
        Ubicación: '',
        'Dirección': '',
        'Código Postal': '',
        'Imagenes del restaurante': [],
      }),
    estadoPlan: z.string().optional().catch(''),
    estadoSala: z.string().optional().catch(''),
    leadKomvo: z.boolean().optional().catch(false),
    kombo: z
      .object({
        'Descripción': z.string().optional().catch(''),
        Fecha: z.string().optional().catch(''),
        FechaCreacion: TimestampLikeSchema.optional().catch(''),
        Hora: z.string().optional().catch(''),
        'Nombre del kombo': z.string().optional().catch(''),
        horaFin: z.string().optional().catch(''),
        'Tamaño del grupo': z
          .object({
            min: z.union([z.string(), z.number()]).optional().catch(''),
            max: z.union([z.string(), z.number()]).optional().catch(''),
          })
          .optional()
          .catch({ min: '', max: '' }),
      })
      .optional()
      .catch({
        'Descripción': '',
        Fecha: '',
        FechaCreacion: '',
        Hora: '',
        'Nombre del kombo': '',
        horaFin: '',
        'Tamaño del grupo': { min: '', max: '' },
      }),
    pack: z
      .object({
        'Nombre del pack': z.string().optional().catch(''),
        Categoria: z.string().optional().catch(''),
        Subcategoria: z.string().optional().nullable().catch(null),
      })
      .optional()
      .catch({ 'Nombre del pack': '', Categoria: '', Subcategoria: null }),
    usuario: z
      .object({
        Email: z.string().optional().catch(''),
        'Nombre de usuario': z.string().optional().catch(''),
        Telefono: z.string().optional().catch(''),
        id: z.string().optional().catch(''),
      })
      .optional()
      .catch({ Email: '', 'Nombre de usuario': '', Telefono: '', id: '' }),
    partnerId: z.string().optional().catch(''),
    pagado: z.boolean().optional().catch(false),
    estado: z.string().optional().catch(''),
    tipoCompra: z.string().optional().catch(''),
    asistentes: z.boolean().optional().catch(false),
    chat: z.boolean().optional().catch(false),
    showChat: z.boolean().optional().catch(false),
    showAsistentes: z.boolean().optional().catch(false),
    requiereAccionPartner: z.boolean().optional().catch(false),
    enManoCliente: z.boolean().optional().catch(false),
    notasReserva: z.array(z.unknown()).optional().catch([]),
    etiquetas: z.array(z.unknown()).optional().catch([]),
    servicio_pagado: z
      .object({
        categoria: z.string().optional().catch(''),
        createdAt: z.unknown().optional(),
        currency: z.string().optional().catch(''),
        items: z
          .array(
            z.object({
              name: z.string().optional().catch(''),
              quantity: z.number().optional().catch(0),
              unit_amount_cents: z.number().optional().catch(0),
              total_cents: z.number().optional().catch(0),
              currency: z.string().optional().catch(''),
            })
          )
          .optional()
          .catch([]),
        total_cents: z.number().optional().catch(0),
        tipoCompra: z.string().optional().catch(''),
      })
      .optional()
      .catch(undefined),
    responsableEquipo: z
      .object({
        id: z.string().optional().catch(''),
        nombre: z.string().optional().catch(''),
        email: z.string().optional().catch(''),
        role: z.string().optional().catch(''),
      })
      .optional()
      .nullable()
      .catch(null),
    cambioSolicitado: z
      .object({
        aforoAnterior: z.union([z.string(), z.number()]).optional().catch(''),
        aforoNuevo: z.union([z.string(), z.number()]).optional().catch(''),
        fechaAnterior: z.string().optional().catch(''),
        fechaNueva: z.string().optional().catch(''),
        fechaSolicitud: z.string().optional().catch(''),
        horaAnterior: z.string().optional().catch(''),
        horaNueva: z.string().optional().catch(''),
        horaFinAnterior: z.string().optional().catch(''),
        horaFinNueva: z.string().optional().catch(''),
      })
      .optional()
      .nullable()
      .catch(null),
  })
  .passthrough();

export type ReservaDoc = z.infer<typeof ReservaDocSchema>;
