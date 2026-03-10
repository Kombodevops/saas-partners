import { z } from 'zod';

export const PackDocSchema = z
  .object({
    'Nombre del pack': z.string().catch(''),
    'Descripcion': z.string().optional(),
    'Descripción': z.string().optional(),
    Precio: z.union([z.number(), z.string()]).optional(),
    activo: z.union([z.boolean(), z.number(), z.string()]).optional(),
    Categoria: z.string().optional().catch(''),
    Subcategoria: z.string().optional().catch(''),
    tipoPlan: z.array(z.string()).optional().catch([]),
    restaurantesIds: z.array(z.string()).optional().catch([]),
  })
  .passthrough();

export type PackDoc = z.infer<typeof PackDocSchema>;
