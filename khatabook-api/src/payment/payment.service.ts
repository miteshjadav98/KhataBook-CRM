import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(shopId: string, data: CreatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      // Create the payment record
      const payment = await tx.payment.create({
        data: {
          shopId,
          type: data.type,
          customerId: data.customerId,
          supplierId: data.supplierId,
          amount: data.amount,
          paymentMode: data.paymentMode,
          notes: data.notes,
        },
      });

      // Update the respective party's due balance
      if (data.type === 'CUSTOMER_PAYMENT') {
        const customer = await tx.customer.findFirst({
          where: { id: data.customerId, shopId, isDeleted: false },
        });
        if (!customer) throw new NotFoundException('Customer not found');

        // Customer pays us -> reduces their totalReceivable (due)
        await tx.customer.update({
          where: { id: data.customerId },
          data: { totalReceivable: { decrement: data.amount } },
        });
      } else if (data.type === 'SUPPLIER_PAYMENT') {
        const supplier = await tx.supplier.findFirst({
          where: { id: data.supplierId, shopId, isDeleted: false },
        });
        if (!supplier) throw new NotFoundException('Supplier not found');

        // We pay supplier -> reduces our totalPayable (due)
        await tx.supplier.update({
          where: { id: data.supplierId },
          data: { totalPayable: { decrement: data.amount } },
        });
      }

      return payment;
    });
  }

  async getPayments(shopId: string) {
    return this.prisma.payment.findMany({
      where: { shopId },
      include: {
        customer: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
