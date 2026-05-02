import { z } from 'zod';

export const RegisterSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  interestRate: z.number().min(0).max(100).optional().default(0),
  defaultCreditDuration: z.number().int().min(1).optional().default(30),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
