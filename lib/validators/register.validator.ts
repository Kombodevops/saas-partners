import { z } from 'zod';

export const registerSchema = z
  .object({
    businessType: z.enum(['autonomo', 'empresa']).optional(),
    nombre: z.string().min(1, 'Nombre requerido'),
    apellidos: z.string().min(1, 'Apellidos requeridos'),
    email: z.string().email('Email inválido'),
    prefijo: z.string().min(1, 'Prefijo requerido'),
    telefono: z.string().min(6, 'Teléfono requerido'),
    fechaNacimiento: z.string().optional(),
    direccion: z.string().optional(),
    ciudad: z.string().optional(),
    cp: z.string().optional(),
    nombreNegocio: z.string().optional(),
    razonSocial: z.string().optional(),
    nif: z.string().optional(),
    direccionFiscal: z.string().optional(),
    codigoPostalNegocio: z.string().optional(),
    ciudadNegocio: z.string().optional(),
    provinciaNegocio: z.string().optional(),
    telefonoNegocio: z.string().optional(),
    numeroCuenta: z.string().optional(),
    nombreTitular: z.string().optional(),
    nombreBanco: z.string().optional(),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirma tu contraseña'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
      });
    }
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
