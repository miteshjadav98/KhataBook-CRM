import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TxType, TxStatus } from '@prisma/client';
import { calculateInterest } from '../utils/interest';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new transaction (UDHAR or JAMA).
   *
   * UDHAR (उधार - Given on credit):
   *   totalAmount = full bill, paidAmount = what customer paid now
   *   remainingAmount = totalAmount - paidAmount - discountAmount
   *   Customer's totalBalance INCREASES by remainingAmount
   *
   * JAMA (जमा - Payment received):
   *   totalAmount = payment amount
   *   paidAmount = totalAmount (full payment)
   *   Customer's totalBalance DECREASES by totalAmount
   */
  async createTransaction(shopId: string, data: CreateTransactionDto) {
    console.log('[TransactionService.createTransaction] Called for shopId:', shopId, 'type:', data.type, 'totalAmount:', data.totalAmount);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Verify customer belongs to the shop and is not deleted
        const customer = await tx.customer.findFirst({
          where: { id: data.customerId, shopId, isDeleted: false },
        });

        if (!customer) {
          throw new NotFoundException('Customer not found in this shop');
        }

        // 2. Verify product if provided
        if (data.productId) {
          const product = await tx.product.findFirst({
            where: { id: data.productId, shopId, isDeleted: false },
          });
          if (!product) {
            throw new NotFoundException('Product not found in this shop');
          }
        }

        let transactionData: any;
        let balanceChange: number;

        if (data.type === TxType.UDHAR) {
          // UDHAR — Customer took goods on credit
          const paidAmount = data.paidAmount || 0;
          const discountAmount = data.discountAmount || 0;
          const remainingAmount = data.totalAmount - paidAmount - discountAmount;

          if (remainingAmount < 0) {
            throw new BadRequestException('Paid amount + discount cannot exceed total amount');
          }

          const status = remainingAmount <= 0 ? TxStatus.PAID : TxStatus.DUE;

          transactionData = {
            shopId,
            customerId: data.customerId,
            productId: data.productId || null,
            type: TxType.UDHAR,
            totalAmount: data.totalAmount,
            paidAmount,
            remainingAmount,
            discountAmount,
            interestRate: data.interestRate || 0,
            status,
            description: data.description || null,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
          };

          // Customer owes MORE → increase balance
          balanceChange = remainingAmount;

        } else {
          // JAMA — Customer making a payment
          transactionData = {
            shopId,
            customerId: data.customerId,
            type: TxType.JAMA,
            totalAmount: data.totalAmount,
            paidAmount: data.totalAmount,
            remainingAmount: 0,
            discountAmount: 0,
            status: TxStatus.PAID,
            description: data.description || null,
          };

          // Customer owes LESS → decrease balance
          balanceChange = -data.totalAmount;
        }

        // 3. Create the transaction
        const transaction = await tx.transaction.create({ data: transactionData });
        console.log('[TransactionService.createTransaction] Transaction created:', transaction.id, 'type:', transaction.type);

        // 4. Update customer balance atomically
        const updatedCustomer = await tx.customer.update({
          where: { id: data.customerId },
          data: {
            totalBalance: {
              increment: balanceChange,
            },
          },
        });
        console.log('[TransactionService.createTransaction] Customer balance updated. New balance:', updatedCustomer.totalBalance);

        return {
          transaction,
          newBalance: updatedCustomer.totalBalance,
        };
      });

      return result;
    } catch (error) {
      console.error('[TransactionService.createTransaction] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Get transactions for a customer with filters.
   */
  async getTransactions(
    shopId: string,
    filters: {
      customerId?: string;
      productId?: string;
      status?: TxStatus;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    console.log('[TransactionService.getTransactions] Called with filters:', JSON.stringify(filters));

    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = { shopId };

      if (filters.customerId) where.customerId = filters.customerId;
      if (filters.productId) where.productId = filters.productId;
      if (filters.status) where.status = filters.status;
      if (filters.startDate || filters.endDate) {
        where.transactionDate = {};
        if (filters.startDate) where.transactionDate.gte = new Date(filters.startDate);
        if (filters.endDate) where.transactionDate.lte = new Date(filters.endDate);
      }

      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          include: {
            customer: { select: { name: true, phone: true } },
            product: { select: { name: true, price: true } },
          },
          orderBy: { transactionDate: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.transaction.count({ where }),
      ]);

      // Enrich DUE transactions with interest
      const enriched = transactions.map((tx) => {
        if (tx.status === 'DUE' && tx.remainingAmount > 0 && tx.dueDate) {
          const interest = calculateInterest(
            tx.remainingAmount,
            tx.dueDate,
            tx.interestRate || undefined,
          );
          return {
            ...tx,
            calculatedInterest: interest.interestAmount,
            totalWithInterest: interest.totalWithInterest,
            monthsOverdue: interest.monthsOverdue,
          };
        }
        return tx;
      });

      console.log('[TransactionService.getTransactions] Found', transactions.length, 'of', total, 'total');

      return {
        data: enriched,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      console.error('[TransactionService.getTransactions] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Get a full ledger view for a customer with running balance.
   * Shows: +1500 (Udhar), -1200 (Jama), = 300 Due
   */
  async getCustomerLedger(shopId: string, customerId: string) {
    console.log('[TransactionService.getCustomerLedger] Called for customerId:', customerId);

    try {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, shopId, isDeleted: false },
        include: { shop: { select: { name: true, interestRate: true } } },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found in this shop');
      }

      const transactions = await this.prisma.transaction.findMany({
        where: { shopId, customerId },
        include: { product: { select: { name: true, price: true } } },
        orderBy: { transactionDate: 'asc' },
      });

      // Build ledger with running balance
      let runningBalance = 0;
      const ledger = transactions.map((tx) => {
        let entryAmount: number;
        let label: string;

        if (tx.type === TxType.UDHAR) {
          entryAmount = tx.remainingAmount; // What's actually owed
          runningBalance += entryAmount;
          label = `+₹${entryAmount} (उधार - Udhar)`;
        } else {
          entryAmount = tx.totalAmount;
          runningBalance -= entryAmount;
          label = `-₹${entryAmount} (जमा - Jama)`;
        }

        // Calculate interest for overdue items
        let interestInfo = null;
        if (tx.status === 'DUE' && tx.remainingAmount > 0 && tx.dueDate) {
          const interest = calculateInterest(tx.remainingAmount, tx.dueDate, tx.interestRate || undefined);
          if (interest.interestAmount > 0) {
            interestInfo = {
              interestAmount: interest.interestAmount,
              totalWithInterest: interest.totalWithInterest,
              monthsOverdue: interest.monthsOverdue,
              rateApplied: interest.rateApplied * 100, // Show as percentage
            };
          }
        }

        return {
          id: tx.id,
          date: tx.transactionDate,
          type: tx.type,
          label,
          totalAmount: tx.totalAmount,
          paidAmount: tx.paidAmount,
          remainingAmount: tx.remainingAmount,
          discountAmount: tx.discountAmount,
          status: tx.status,
          dueDate: tx.dueDate,
          description: tx.description,
          productName: tx.product?.name || null,
          runningBalance: Math.round(runningBalance * 100) / 100,
          interest: interestInfo,
        };
      });

      return {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          totalBalance: customer.totalBalance,
          shopName: customer.shop.name,
        },
        ledger,
        summary: {
          totalBalance: customer.totalBalance,
          balanceStatus: customer.totalBalance <= 0 ? 'चुकता (Clear)' : `बकाया ₹${customer.totalBalance} (Due)`,
        },
      };
    } catch (error) {
      console.error('[TransactionService.getCustomerLedger] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Dashboard metrics for a shop.
   */
  async getDashboardMetrics(shopId: string) {
    console.log('[TransactionService.getDashboardMetrics] Called for shopId:', shopId);

    try {
      // Total due (sum of remaining amounts for DUE/OVERDUE transactions)
      const dueResult = await this.prisma.transaction.aggregate({
        where: { shopId, status: { in: [TxStatus.DUE, TxStatus.OVERDUE] } },
        _sum: { remainingAmount: true },
      });

      // Total collected (sum of paid amounts across all transactions)
      const collectedResult = await this.prisma.transaction.aggregate({
        where: { shopId },
        _sum: { paidAmount: true },
      });

      // Overdue amount (due transactions past due date)
      const overdueResult = await this.prisma.transaction.aggregate({
        where: {
          shopId,
          status: TxStatus.DUE,
          dueDate: { lt: new Date() },
        },
        _sum: { remainingAmount: true },
      });

      // Monthly revenue (JAMA transactions this month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyResult = await this.prisma.transaction.aggregate({
        where: {
          shopId,
          type: TxType.JAMA,
          transactionDate: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      });

      // Customer counts
      const totalCustomers = await this.prisma.customer.count({
        where: { shopId, isDeleted: false },
      });

      const customersWithDue = await this.prisma.customer.count({
        where: { shopId, isDeleted: false, totalBalance: { gt: 0 } },
      });

      return {
        totalDue: dueResult._sum.remainingAmount || 0,
        totalCollected: collectedResult._sum.paidAmount || 0,
        overdueAmount: overdueResult._sum.remainingAmount || 0,
        monthlyRevenue: monthlyResult._sum.totalAmount || 0,
        totalCustomers,
        customersWithDue,
      };
    } catch (error) {
      console.error('[TransactionService.getDashboardMetrics] ERROR:', error.message || error);
      throw error;
    }
  }
}
