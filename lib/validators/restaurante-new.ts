import { z } from 'zod';

const TimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido');

const HorarioIntervaloSchema = z.object({
  horaInicio: TimeSchema,
  horaFin: TimeSchema,
});

const HorarioDiaSchema = z.object({
  cerrado: z.boolean(),
  intervalos: z.array(HorarioIntervaloSchema),
});

const RacionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  precio: z.number().min(0, 'El precio debe ser válido'),
});

const ConsumicionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  precio: z.number().min(0.01, 'El precio debe ser válido'),
});

const ExtraSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    descripcion: z.string().min(1, 'La descripción es obligatoria'),
    precio: z.number().min(0.01, 'El precio debe ser válido'),
    tipoPrecio: z.enum(['fijo', 'porHora', 'porUnidad']),
    tiempoMinimoHoras: z.number().optional(),
    tipoIncremento: z.enum(['porHora', 'porMediaHora']).optional(),
    unidadesMinimas: z.number().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tipoPrecio === 'porHora') {
      if (!value.tiempoMinimoHoras || value.tiempoMinimoHoras <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El tiempo mínimo es obligatorio',
          path: ['tiempoMinimoHoras'],
        });
      }
      if (!value.tipoIncremento) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El tipo de incremento es obligatorio',
          path: ['tipoIncremento'],
        });
      }
    }
    if (value.tipoPrecio === 'porUnidad') {
      if (!value.unidadesMinimas || value.unidadesMinimas <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Las unidades mínimas son obligatorias',
          path: ['unidadesMinimas'],
        });
      }
    }
  });

const SalaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  aforoMinimo: z.number().min(1, 'El aforo mínimo debe ser válido'),
  aforoMaximo: z.number().min(1, 'El aforo máximo debe ser válido'),
  permiteReservaSinCompraAnticipada: z.boolean(),
  precioPrivatizacion: z.number().min(0, 'El precio debe ser válido'),
  caracteristicas: z.record(z.string(), z.string().min(1, 'La descripción es obligatoria')),
});

const CaracteristicasSchema = z.record(
  z.string(),
  z.string().min(1, 'La descripción es obligatoria')
);

export const RestauranteNewSchema = z.object({
  basico: z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    descripcion: z.string().min(1, 'La descripción es obligatoria'),
    telefono: z.string().min(1, 'El teléfono es obligatorio'),
    tipoCocina: z.string().min(1, 'El tipo de cocina es obligatorio'),
    aforoMin: z.number().min(0),
    aforoMax: z.number().min(0),
    presupuesto: z.enum(['1', '2', '3']),
  }),
  ubicacion: z.object({
    direccion: z.string().min(1, 'La dirección es obligatoria'),
    ciudad: z.string().min(1, 'La ciudad es obligatoria'),
    codigoPostal: z.string().min(1, 'El código postal es obligatorio'),
    ubicacion: z.enum(['Chamberí', 'Barrio Salamanca', 'Azca/Bernabeu', 'Otras Zonas']),
  }),
  horarios: z.record(z.string(), HorarioDiaSchema),
  raciones: z.array(RacionSchema),
  salas: z.array(SalaSchema),
  consumiciones: z.array(ConsumicionSchema),
  extras: z.array(ExtraSchema),
  caracteristicas: CaracteristicasSchema,
  responsable: z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    telefono: z.string().min(1, 'El teléfono es obligatorio'),
  }),
});

export type RestauranteNewForm = z.infer<typeof RestauranteNewSchema>;
