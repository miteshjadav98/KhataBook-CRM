import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  price: z.number().positive('Price must be positive'),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
