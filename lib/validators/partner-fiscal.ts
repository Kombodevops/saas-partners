import { z } from 'zod';

export const PartnerFiscalSchema = z
  .object({
    Email: z.string().optional().catch(''),
    Prefijo: z.string().optional().catch(''),
    'Número de teléfono': z.string().optional().catch(''),
    'Fecha de nacimiento': z.string().optional().catch(''),
    nombre: z.string().optional().catch(''),
    'Nombre del negocio': z.string().optional().catch(''),
    Apellidos: z.string().optional().catch(''),
    Dirección: z.string().optional().catch(''),
    Ciudad: z.string().optional().catch(''),
    CP: z.string().optional().catch(''),
    'Razón social': z.string().optional().catch(''),
    NIF: z.string().optional().catch(''),
    'Dirección Fiscal': z.string().optional().catch(''),
    'Código Postal del negocio': z.string().optional().catch(''),
    'Ciudad del negocio': z.string().optional().catch(''),
    'Provincia del negocio': z.string().optional().catch(''),
    'Teléfono del negocio': z.string().optional().catch(''),
    'Numero de cuenta': z.string().optional().catch(''),
    'Nombre y apellidos del titular de la cuenta': z.string().optional().catch(''),
    'Nombre del banco': z.string().optional().catch(''),
    contrato: z.string().optional().catch(''),
    stripeAccountId: z.string().optional().catch(''),
    isBusiness: z.boolean().optional().catch(false),
  })
  .passthrough();

export type PartnerFiscal = z.infer<typeof PartnerFiscalSchema>;
