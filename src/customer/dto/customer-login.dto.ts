import { z } from 'zod';

export const CustomerLoginSchema = z.object({
  phone: z.string().min(10, 'Phone is required'),
  password: z.string().min(1, 'Password is required'),
  shopId: z.string().uuid('Invalid shop ID'),
});

export type CustomerLoginDto = z.infer<typeof CustomerLoginSchema>;
