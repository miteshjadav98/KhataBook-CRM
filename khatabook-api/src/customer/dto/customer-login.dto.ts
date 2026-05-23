import { z } from 'zod';

export const CustomerLoginSchema = z.object({
  identifier: z.string().min(1, 'Phone or email is required'),
  password: z.string().min(1, 'Password is required'),
  shopId: z.string().optional(), // Optional: if provided, login to specific shop
});

export type CustomerLoginDto = z.infer<typeof CustomerLoginSchema>;
