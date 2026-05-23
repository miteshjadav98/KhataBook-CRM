import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  stockQty: z.number().min(0, 'Stock cannot be negative').optional(),
  defaultPurchasePrice: z.number().min(0).optional(),
  defaultSellingPrice: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'PIECES', 'DOZEN', 'CARTON', 'PACKET']).optional(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
