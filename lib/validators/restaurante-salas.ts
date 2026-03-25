import { z } from 'zod';

export const SalaSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().min(1, 'Descripcion requerida'),
  aforoMinimo: z.coerce.number().min(1, 'El aforo mínimo debe ser mayor que 0'),
  aforoMaximo: z.coerce.number().min(1, 'El aforo máximo debe ser mayor que 0'),
  permiteReservaSinCompraAnticipada: z.boolean(),
  precioPrivatizacion: z.coerce.number().min(0),
  caracteristicas: z.record(z.string(), z.string()).optional().catch({}),
});

export const RestauranteSalasSchema = z.object({
  salas: z
    .array(SalaSchema)
    .min(1, 'Debe haber al menos una sala')
    .refine(
      (salas) => salas.every((sala) => sala.caracteristicas && Object.keys(sala.caracteristicas).length > 0),
      { message: 'Cada sala debe tener al menos una característica.' }
    ),
});

export type SalaForm = z.infer<typeof SalaSchema>;
export type RestauranteSalasForm = z.infer<typeof RestauranteSalasSchema>;
