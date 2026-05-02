import { z } from 'zod';
import { TxType } from '@prisma/client';

export const CreateTransactionSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  type: z.nativeEnum(TxType),
  totalAmount: z.number().positive('Total amount must be positive'),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative').default(0),
  discountAmount: z.number().min(0, 'Discount cannot be negative').default(0),
  dueDate: z.string().datetime().optional(),
  interestRate: z.number().min(0).optional(),
  description: z.string().optional(),
});

export type CreateTransactionDto = z.infer<typeof CreateTransactionSchema>;
