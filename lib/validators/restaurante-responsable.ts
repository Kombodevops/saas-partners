import { z } from 'zod';

export const RestauranteResponsableSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  telefono: z.string().min(1, 'Telefono requerido'),
});

export type RestauranteResponsableForm = z.infer<typeof RestauranteResponsableSchema>;
