import { z } from 'zod';
import { PaymentMode, PaymentType } from '@prisma/client';

export const CreatePaymentSchema = z.object({
  type: z.nativeEnum(PaymentType),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  paymentMode: z.nativeEnum(PaymentMode).default('CASH'),
  notes: z.string().optional(),
}).refine(data => {
  if (data.type === 'CUSTOMER_PAYMENT' && !data.customerId) return false;
  if (data.type === 'SUPPLIER_PAYMENT' && !data.supplierId) return false;
  return true;
}, {
  message: 'Appropriate party ID (customerId or supplierId) is required based on payment type',
});

export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;
