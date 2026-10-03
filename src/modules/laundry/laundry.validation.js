import { z } from 'zod';
export const addLaundrySchema = z.object({ body: z.object({ itemId: z.string().min(1), notes: z.string().optional() }), params: z.object({}), query: z.object({}) });
export const statusSchema = z.object({ body: z.object({ status: z.enum(['waiting','washing','drying','ready']) }), params: z.object({ id: z.string().min(1) }), query: z.object({}) });
