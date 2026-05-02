import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TxType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async createTransaction(shopId: string, data: CreateTransactionDto) {
    console.log('[TransactionService.createTransaction] Called for shopId:', shopId, 'customerId:', data.customerId, 'type:', data.type, 'amount:', data.amount);

    try {
      // We use Prisma's interactive transaction for atomic operations
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Verify customer belongs to the shop
        const customer = await tx.customer.findFirst({
          where: { id: data.customerId, shopId },
        });

        if (!customer) {
          console.log('[TransactionService.createTransaction] Customer not found in shop');
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
        console.log('[TransactionService.createTransaction] Transaction created:', transaction.id);

        // 3. Update customer balance atomically
        // If CREDIT (Debt), subtract. If DEBIT (Payment), add.
        const balanceChange = data.type === TxType.CREDIT ? -data.amount : data.amount;

        const updatedCustomer = await tx.customer.update({
          where: { id: data.customerId },
          data: {
            totalBalance: {
              increment: balanceChange,
            },
          },
        });
        console.log('[TransactionService.createTransaction] Customer balance updated. New balance:', updatedCustomer.totalBalance);

        return transaction;
      });

      return result;
    } catch (error) {
      console.error('[TransactionService.createTransaction] ERROR:', error.message || error);
      throw error;
    }
  }

  async getTransactions(shopId: string, customerId: string, page: number = 1, limit: number = 10) {
    console.log('[TransactionService.getTransactions] Called for shopId:', shopId, 'customerId:', customerId, 'page:', page);

    try {
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

      console.log('[TransactionService.getTransactions] Found', transactions.length, 'of', total, 'total');

      return {
        data: transactions,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('[TransactionService.getTransactions] ERROR:', error.message || error);
      throw error;
    }
  }
}
