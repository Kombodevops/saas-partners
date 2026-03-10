import { z } from 'zod';

export const ConsumicionBarraSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().min(1, 'Descripción requerida'),
  precio: z.coerce.number().min(0, 'Precio inválido'),
});

export const RestauranteBarraSchema = z.object({
  consumiciones: z.array(ConsumicionBarraSchema),
});

export type ConsumicionBarraForm = z.infer<typeof ConsumicionBarraSchema>;
export type RestauranteBarraForm = z.infer<typeof RestauranteBarraSchema>;
