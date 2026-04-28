import { z } from 'zod';

export const CreateCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type CreateCustomerDto = z.infer<typeof CreateCustomerSchema>;
