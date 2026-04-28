import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TxType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async createTransaction(shopId: string, data: CreateTransactionDto) {
    // We use Prisma's interactive transaction for atomic operations
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify customer belongs to the shop
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, shopId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found in this shop');
      }

      // 2. Create the transaction
      const transaction = await tx.transaction.create({
        data: {
          shopId,
          customerId: data.customerId,
          productId: data.productId,
          amount: data.amount,
          type: data.type,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        },
      });

      // 3. Update customer balance atomically
      // If CREDIT (Debt), subtract. If DEBIT (Payment), add.
      const balanceChange = data.type === TxType.CREDIT ? -data.amount : data.amount;

      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          totalBalance: {
            increment: balanceChange,
          },
        },
      });

      return transaction;
    });
  }

  async getTransactions(shopId: string, customerId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { shopId, customerId },
        orderBy: { purchaseDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: { shopId, customerId },
      }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
