import { z } from 'zod';

const normalizeDigits = (value: string) => value.replace(/\s+/g, '');
const normalizeUpper = (value: string) => value.trim().toUpperCase();

const isSpanishPostalCode = (value: string) => /^[0-9]{5}$/.test(normalizeDigits(value));
const isSpanishPhone = (value: string) => /^[0-9]{9}$/.test(normalizeDigits(value));
const isSpanishIban = (value: string) => /^ES[0-9]{22}$/.test(normalizeUpper(value).replace(/\s+/g, ''));

const isNif = (value: string) => {
  const val = normalizeUpper(value);
  return /^[0-9]{8}[A-Z]$/.test(val);
};

const isCif = (value: string) => {
  const val = normalizeUpper(value);
  return /^[ABCDEFGHJNPQRSUVW][0-9]{7}([0-9A-J])?$/.test(val);
};

export const RestauranteFiscalSchema = z
  .object({
    businessType: z.enum(['autonomo', 'empresa']),
    email: z.string().email('Email inválido'),
    nombre: z.string().min(1, 'Nombre requerido'),
    apellidos: z.string().min(1, 'Apellidos requeridos'),
    prefijo: z.string().min(1, 'Prefijo requerido'),
    telefono: z.string().min(1, 'Teléfono requerido'),
    fechaNacimiento: z.string().min(1, 'Fecha requerida'),
    direccion: z.string().min(1, 'Dirección requerida'),
    ciudad: z.string().min(1, 'Ciudad requerida'),
    cp: z.string().min(1, 'CP requerido'),
    razonSocial: z.string().min(1, 'Razón social requerida'),
    nif: z.string().min(1, 'NIF/CIF requerido'),
    direccionFiscal: z.string().min(1, 'Dirección fiscal requerida'),
    codigoPostalNegocio: z.string().min(1, 'CP del negocio requerido'),
    ciudadNegocio: z.string().min(1, 'Ciudad del negocio requerida'),
    provinciaNegocio: z.string().min(1, 'Provincia del negocio requerida'),
    telefonoNegocio: z.string().min(1, 'Teléfono del negocio requerido'),
    numeroCuenta: z.string().min(1, 'Número de cuenta requerido'),
    nombreTitular: z.string().min(1, 'Titular requerido'),
    nombreBanco: z.string().min(1, 'Banco requerido'),
    contrato: z.string().optional(),
    stripeAccountId: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!isSpanishPostalCode(values.cp)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cp'],
        message: 'El código postal debe tener 5 dígitos',
      });
    }

    if (!isSpanishPostalCode(values.codigoPostalNegocio)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codigoPostalNegocio'],
        message: 'El código postal del negocio debe tener 5 dígitos',
      });
    }

    if (normalizeUpper(values.prefijo).replace(/\s+/g, '') === '+34' && !isSpanishPhone(values.telefono)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['telefono'],
        message: 'El teléfono debe tener 9 dígitos para España',
      });
    }

    if (!isSpanishPhone(values.telefonoNegocio)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['telefonoNegocio'],
        message: 'El teléfono del negocio debe tener 9 dígitos',
      });
    }

    if (!isSpanishIban(values.numeroCuenta)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['numeroCuenta'],
        message: 'El IBAN debe ser español (ES + 22 dígitos)',
      });
    }

    if (values.businessType === 'autonomo' && !isNif(values.nif)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nif'],
        message: 'Para autónomo, el NIF debe tener 8 números y una letra',
      });
    }

    if (values.businessType === 'empresa' && !isCif(values.nif)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nif'],
        message: 'Para empresa, el CIF no es válido',
      });
    }
  });

export type RestauranteFiscalForm = z.infer<typeof RestauranteFiscalSchema>;
