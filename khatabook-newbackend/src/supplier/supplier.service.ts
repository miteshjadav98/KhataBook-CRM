import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async createSupplier(shopId: string, data: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        shopId,
        ...data,
      },
    });
  }

  async getSuppliers(shopId: string) {
    return this.prisma.supplier.findMany({
      where: { shopId, isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async getSupplierById(shopId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, shopId, isDeleted: false },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async getSupplierLedger(shopId: string, supplierId: string) {
    // Get all purchases and payments for a specific supplier
    const purchases = await this.prisma.purchase.findMany({
      where: { shopId, supplierId },
      orderBy: { createdAt: 'desc' },
    });
    
    const payments = await this.prisma.payment.findMany({
      where: { shopId, supplierId, type: 'SUPPLIER_PAYMENT' },
      orderBy: { createdAt: 'desc' },
    });

    return { purchases, payments };
  }
}
