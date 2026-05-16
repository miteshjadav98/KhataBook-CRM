import { z } from 'zod';

export const CustomerLoginSchema = z.object({
  identifier: z.string().min(1, 'Phone or email is required'),
  password: z.string().min(1, 'Password is required'),
  shopCode: z.string().min(1, 'Shop Code is required'),
});

export type CustomerLoginDto = z.infer<typeof CustomerLoginSchema>;
