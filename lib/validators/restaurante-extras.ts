import { z } from 'zod';

export const TipoPrecioSchema = z.enum(['fijo', 'porHora', 'porUnidad']);
export const TipoIncrementoSchema = z.enum(['porHora', 'porMediaHora']);

export const ExtraSchema = z
  .object({
    nombre: z.string().min(1, 'Nombre requerido'),
    descripcion: z.string().min(1, 'Descripción requerida'),
    precio: z.coerce.number().min(0.01, 'Precio inválido'),
    tipoPrecio: TipoPrecioSchema,
    tiempoMinimoHoras: z.coerce.number().min(1, 'Tiempo mínimo inválido').optional(),
    tipoIncremento: TipoIncrementoSchema.optional(),
    unidadesMinimas: z.coerce.number().min(1, 'Unidades mínimas inválidas').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tipoPrecio === 'porHora') {
      if (!value.tiempoMinimoHoras) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Indica el tiempo mínimo en horas',
          path: ['tiempoMinimoHoras'],
        });
      }
      if (!value.tipoIncremento) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecciona el tipo de incremento',
          path: ['tipoIncremento'],
        });
      }
    }

    if (value.tipoPrecio === 'porUnidad' && !value.unidadesMinimas) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indica las unidades mínimas',
        path: ['unidadesMinimas'],
      });
    }
  });

export const RestauranteExtrasSchema = z.object({
  extras: z.array(ExtraSchema),
});

export type ExtraForm = z.infer<typeof ExtraSchema>;
export type RestauranteExtrasForm = z.infer<typeof RestauranteExtrasSchema>;
export type TipoPrecio = z.infer<typeof TipoPrecioSchema>;
export type TipoIncremento = z.infer<typeof TipoIncrementoSchema>;
