import { z } from 'zod';

export const ReservaCreateSchema = z.object({
  restauranteId: z.string().min(1, 'Selecciona un restaurante'),
  salaId: z.string().min(1, 'Selecciona una sala'),
  packId: z.string().min(1, 'Selecciona un plan'),
  nombreUsuario: z.string().min(1, 'Nombre obligatorio'),
  email: z.union([z.string().email('Email inválido'), z.literal('')]).optional().catch(''),
  fecha: z.string().min(1, 'Selecciona una fecha'),
  horaInicio: z.string().min(1, 'Selecciona hora'),
  horaFin: z.string().min(1, 'Selecciona hora'),
  fechaLimite: z.string().min(1, 'Selecciona fecha límite'),
  aforoMin: z.coerce.number().min(1, 'Aforo mínimo inválido'),
  aforoMax: z.coerce.number().min(1, 'Aforo máximo inválido'),
  anticipoActivo: z.boolean().optional().catch(false),
  anticipoDescripcion: z.string().optional().catch(''),
  anticipoPrecio: z.coerce.number().optional().catch(0),
  questions: z
    .array(
      z.object({
        question: z.string(),
        question_type: z.enum(['string', 'choice', 'boolean']),
        required: z.boolean(),
        options: z.array(z.string()).optional(),
      })
    )
    .optional()
    .catch([]),
});

export type ReservaCreateForm = z.infer<typeof ReservaCreateSchema>;
