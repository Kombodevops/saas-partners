import { z } from 'zod';

const DisponibilidadPorRestauranteSchema = z.object({
  restauranteId: z.string().catch(''),
  diasDisponibles: z.array(z.string()).catch([]),
});

export const MenuEditSchema = z.object({
  Nombre: z.string().min(1, 'Nombre requerido'),
  Descripción: z.string().min(1, 'Descripción requerida'),
  Precio: z.coerce.number().min(0, 'Precio inválido'),
  tipoServicio: z.string().optional().catch(''),
  restaurantesIds: z.array(z.string()).optional().catch([]),
  disponibilidadPorRestaurante: z.array(DisponibilidadPorRestauranteSchema).optional().catch([]),
});

export const TicketEditSchema = z.object({
  Nombre: z.string().min(1, 'Nombre requerido'),
  Descripción: z.string().min(1, 'Descripción requerida'),
  Precio: z.coerce.number().min(0, 'Precio inválido'),
  restaurantesIds: z.array(z.string()).optional().catch([]),
  disponibilidadPorRestaurante: z.array(DisponibilidadPorRestauranteSchema).optional().catch([]),
});

export const BarraLibreIntervaloSchema = z.object({
  duracionMin: z.string().min(1, 'Duración mínima requerida'),
  duracionMax: z.string().min(1, 'Duración máxima requerida'),
  precio: z.coerce.number().min(0, 'Precio inválido'),
});

export const BarraLibreEditSchema = z.object({
  Nombre: z.string().min(1, 'Nombre requerido'),
  Descripción: z.string().min(1, 'Descripción requerida'),
  restaurantesIds: z.array(z.string()).optional().catch([]),
  disponibilidadPorRestaurante: z.array(DisponibilidadPorRestauranteSchema).optional().catch([]),
  intervalos: z.array(BarraLibreIntervaloSchema).optional().catch([]),
});

export const PackEditSchema = z.object({
  'Nombre del pack': z.string().min(1, 'Nombre requerido'),
  'Descripción': z.string().min(1, 'Descripción requerida'),
  Precio: z.coerce.number().min(0, 'Precio inválido').optional().catch(0),
  activo: z.boolean().optional().catch(true),
  Categoria: z.string().optional().catch(''),
  Subcategoria: z.string().optional().catch(''),
  tipoPlan: z.array(z.string()).optional().catch([]),
  restaurantesIds: z.array(z.string()).optional().catch([]),
  restaurantesPermiteComida: z.array(z.string()).optional().catch([]),
  Menus: z.array(MenuEditSchema).optional().catch([]),
  Tickets: z.array(TicketEditSchema).optional().catch([]),
  'Barra Libre': z.array(BarraLibreEditSchema).optional().catch([]),
});

export type PackEditForm = z.infer<typeof PackEditSchema>;
export type MenuEditForm = z.infer<typeof MenuEditSchema>;
export type TicketEditForm = z.infer<typeof TicketEditSchema>;
export type BarraLibreEditForm = z.infer<typeof BarraLibreEditSchema>;
export type BarraLibreIntervaloForm = z.infer<typeof BarraLibreIntervaloSchema>;
