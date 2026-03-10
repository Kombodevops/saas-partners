import { z } from 'zod';

export const RestauranteDocSchema = z
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
    color: z.string().optional().catch(''),
  })
  .passthrough();

export type RestauranteDoc = z.infer<typeof RestauranteDocSchema>;
