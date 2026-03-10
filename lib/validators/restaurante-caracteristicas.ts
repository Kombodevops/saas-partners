import { z } from 'zod';

export const CARACTERISTICAS_FIJAS = [
  'Terraza',
  'Terraza cubierta',
  'Espacio interior',
  'Zona de baile',
  'Deportes',
  'Material de proyección',
  'Karaoke',
  'Pon tu propia música',
  'DJ',
  'Privatizable',
] as const;

export const RestauranteCaracteristicasSchema = z.object({
  seleccionadas: z.array(z.enum(CARACTERISTICAS_FIJAS)),
});

export type RestauranteCaracteristicasForm = z.infer<typeof RestauranteCaracteristicasSchema>;
