import { z } from 'zod';

export const workerRoles = ['admin', 'gestor'] as const;

export const createWorkerSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(workerRoles),
});

export type CreateWorkerFormData = z.infer<typeof createWorkerSchema>;
