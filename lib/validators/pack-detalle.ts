import { z } from 'zod';

const DisponibilidadPorRestauranteSchema = z.object({
  restauranteId: z.string().catch(''),
  diasDisponibles: z.array(z.string()).catch([]),
});

const MenuSchema = z.object({
  Nombre: z.string().catch(''),
  Descripción: z.string().catch(''),
  Precio: z.union([z.string(), z.number()]).catch(0),
  tipoServicio: z.string().optional().catch(''),
  restaurantesIds: z.array(z.string()).catch([]),
  disponibilidadPorRestaurante: z.array(DisponibilidadPorRestauranteSchema).catch([]),
});

const BarraLibreIntervaloSchema = z.object({
  duracionMin: z.string().catch(''),
  duracionMax: z.string().catch(''),
  precio: z.union([z.string(), z.number()]).catch(0),
});

const BarraLibreSchema = z.object({
  Nombre: z.string().catch(''),
  Descripción: z.string().catch(''),
  restaurantesIds: z.array(z.string()).catch([]),
  disponibilidadPorRestaurante: z.array(DisponibilidadPorRestauranteSchema).catch([]),
  intervalos: z.array(BarraLibreIntervaloSchema).catch([]),
});

const TicketSchema = z.object({
  Nombre: z.string().catch(''),
  Descripción: z.string().catch(''),
  Precio: z.union([z.string(), z.number()]).catch(0),
  restaurantesIds: z.array(z.string()).catch([]),
  disponibilidadPorRestaurante: z.array(DisponibilidadPorRestauranteSchema).catch([]),
});

export const PackDetalleDocSchema = z
  .object({
    'Nombre del pack': z.string().catch(''),
    'Descripción': z.string().catch(''),
    Precio: z.union([z.string(), z.number()]).optional().catch(0),
    activo: z.union([z.boolean(), z.number(), z.string()]).optional().catch(true),
    Categoria: z.string().optional().catch(''),
    Subcategoria: z.string().optional().catch(''),
    tipoPlan: z.array(z.string()).optional().catch([]),
    restaurantesIds: z.array(z.string()).optional().catch([]),
    idPropietario: z.string().optional().catch(''),
    idRestaurante: z.string().nullable().optional(),
    prioridad: z.union([z.string(), z.number()]).optional().catch(0),
    slug: z.string().optional().catch(''),
    Menus: z.array(MenuSchema).nullable().optional().catch([]),
    'Barra Libre': z.array(BarraLibreSchema).nullable().optional().catch([]),
    Tickets: z.array(TicketSchema).nullable().optional().catch([]),
  })
  .passthrough();

export type PackDetalleDoc = z.infer<typeof PackDetalleDocSchema>;
