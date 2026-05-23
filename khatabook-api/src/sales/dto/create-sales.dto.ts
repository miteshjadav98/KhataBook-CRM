import { z } from 'zod';
import { PaymentMode } from '@prisma/client';

export const SalesItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  qty: z.number().positive('Quantity must be positive'),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
});

export const CreateSalesSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  invoiceNumber: z.string().optional(),
  items: z.array(SalesItemSchema).min(1, 'At least one item is required'),
  paidAmount: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  paymentMode: z.nativeEnum(PaymentMode).default('CASH'),
  notes: z.string().optional(),
});

export type CreateSalesDto = z.infer<typeof CreateSalesSchema>;
