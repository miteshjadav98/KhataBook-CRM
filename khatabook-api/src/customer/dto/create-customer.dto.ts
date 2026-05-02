import { z } from 'zod';

export const CreateCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => data.phone || data.email, {
  message: "Either phone or email must be provided",
  path: ["phone"],
});

export type CreateCustomerDto = z.infer<typeof CreateCustomerSchema>;
