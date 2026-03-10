import { z } from 'zod';

export const AsistenciaInvitadoSchema = z
  .object({
    alergias: z.union([z.string(), z.array(z.string())]).optional().catch(undefined),
    tipoAsistencia: z.string().optional().catch(''),
  })
  .passthrough();

export const AsistenciaDocSchema = z
  .object({
    alergias: z.union([z.string(), z.array(z.string())]).optional().catch(undefined),
    invitados: z.array(AsistenciaInvitadoSchema).optional().catch([]),
    tipoAsistencia: z.string().optional().catch(''),
    paymentIntentId: z.string().optional().catch(''),
  })
  .passthrough();

export type AsistenciaDoc = z.infer<typeof AsistenciaDocSchema>;

export const ChatMessageSchema = z
  .object({
    content: z.string().optional().catch(''),
    texto: z.string().optional().catch(''),
    message: z.string().optional().catch(''),
    sender: z
      .object({
        id: z.string().optional().catch(''),
        nombre: z.string().optional().catch(''),
      })
      .optional()
      .catch(undefined),
    senderId: z.string().optional().catch(''),
    timestamp: z.any().optional(),
    readBy: z.record(z.string(), z.boolean()).optional().catch(undefined),
  })
  .passthrough();

export type ChatMessageDoc = z.infer<typeof ChatMessageSchema>;

export const FacturaDocSchema = z
  .object({
    tipo: z.string().optional().catch(''),
    estado: z.string().optional().catch(''),
    total: z.number().optional().catch(undefined),
    importe: z.number().optional().catch(undefined),
    createdAt: z.any().optional(),
    descripcion: z.string().optional().catch(''),
  })
  .passthrough();

export type FacturaDoc = z.infer<typeof FacturaDocSchema>;

export const NotaSchema = z
  .object({
    contenido: z.string().optional().catch(''),
    autor: z.string().optional().catch(''),
    fechaCreacion: z.any().optional(),
    fechaActualizacion: z.any().optional(),
    x: z.number().nullable().optional().catch(null),
    y: z.number().nullable().optional().catch(null),
    xPct: z.number().nullable().optional().catch(null),
    yPct: z.number().nullable().optional().catch(null),
  })
  .passthrough();

export type NotaDoc = z.infer<typeof NotaSchema>;

export const EtiquetaSchema = z
  .object({
    nombre: z.string().optional().catch(''),
    texto: z.string().optional().catch(''),
    color: z.number().optional().catch(undefined),
    fechaCreacion: z.any().optional(),
  })
  .passthrough();

export type EtiquetaDoc = z.infer<typeof EtiquetaSchema>;
