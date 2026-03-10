import { z } from 'zod';

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

export const HorarioIntervaloSchema = z.object({
  horaInicio: z.string().min(1, 'Hora inicio requerida'),
  horaFin: z.string().min(1, 'Hora fin requerida'),
});

export const HorarioDiaSchema = z.object({
  cerrado: z.boolean(),
  intervalos: z.array(HorarioIntervaloSchema),
});

export const RestauranteHorarioSchema = z.object({
  dias: z.record(z.enum(DIAS_SEMANA), HorarioDiaSchema),
});

export type RestauranteHorarioForm = z.infer<typeof RestauranteHorarioSchema>;
