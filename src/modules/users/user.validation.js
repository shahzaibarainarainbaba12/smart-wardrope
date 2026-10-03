import { z } from 'zod';
export const updateUserSchema=z.object({body:z.object({name:z.string().min(2).optional(),email:z.string().email().optional(),currentPassword:z.string().optional(),newPassword:z.string().min(8).optional()}),params:z.object({}),query:z.object({})});
