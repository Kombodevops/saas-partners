import { z } from 'zod';

export const UBICACIONES = ['Chamberi', 'Barrio Salamanca', 'Azca/Bernabeu', 'Otras Zonas'] as const;
export const PRESUPUESTOS = ['1', '2', '3'] as const;

export const RestauranteGeneralSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().min(1, 'Descripcion requerida'),
  direccion: z.string().min(1, 'Direccion requerida'),
  codigoPostal: z.string().min(1, 'Codigo postal requerido'),
  ciudad: z.string().min(1, 'Ciudad requerida'),
  ubicacion: z.enum(UBICACIONES),
  tipoCocina: z.string().min(1, 'Tipo de cocina requerido'),
  telefono: z.string().min(1, 'Telefono requerido'),
  presupuesto: z.enum(PRESUPUESTOS),
  aforoMin: z.coerce.number().min(0, 'Minimo invalido'),
  aforoMax: z.coerce.number().min(0, 'Maximo invalido'),
});

export type RestauranteGeneralForm = z.infer<typeof RestauranteGeneralSchema>;
