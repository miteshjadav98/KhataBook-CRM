import { z } from 'zod';
import { TxType } from '@prisma/client';

export const CreateTransactionSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  amount: z.number().positive(),
  type: z.nativeEnum(TxType),
  dueDate: z.string().datetime().optional(),
});

export type CreateTransactionDto = z.infer<typeof CreateTransactionSchema>;
