import { z } from 'zod';

export const ChatDocSchema = z
  .object({
    reservaId: z.string().optional().catch(''),
    nombreChat: z.string().optional().catch(''),
  })
  .passthrough();

export type ChatDoc = z.infer<typeof ChatDocSchema>;

export const ChatInboxDocSchema = z
  .object({
    unreadCount: z.number().optional().catch(0),
  })
  .passthrough();

export type ChatInboxDoc = z.infer<typeof ChatInboxDocSchema>;
