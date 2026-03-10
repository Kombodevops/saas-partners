import { z } from 'zod';

export const RacionSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().min(1, 'Descripción requerida'),
  precio: z.coerce.number().min(0, 'Precio inválido'),
});

export const RestauranteRacionesSchema = z.object({
  raciones: z.array(RacionSchema),
});

export type RacionForm = z.infer<typeof RacionSchema>;
export type RestauranteRacionesForm = z.infer<typeof RestauranteRacionesSchema>;
