import { z } from 'zod';
import { PaymentMode } from '@prisma/client';

export const PurchaseItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  qty: z.number().positive('Quantity must be positive'),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
  sellingPrice: z.number().min(0).optional(),
});

export const CreatePurchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  invoiceNumber: z.string().optional(),
  items: z.array(PurchaseItemSchema).min(1, 'At least one item is required'),
  subtotal: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  paymentMode: z.nativeEnum(PaymentMode).default('CASH'),
  notes: z.string().optional(),
});

export type CreatePurchaseDto = z.infer<typeof CreatePurchaseSchema>;
