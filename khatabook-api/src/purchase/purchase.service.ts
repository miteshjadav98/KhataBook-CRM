import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchaseService {
  constructor(private readonly prisma: PrismaService) {}

  async createPurchase(shopId: string, data: CreatePurchaseDto) {
    console.log('[PurchaseService.createPurchase] shopId:', shopId, data);
    
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: data.supplierId, shopId, isDeleted: false },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const dueAmount = data.subtotal - data.discount - data.paidAmount;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Purchase record
      const purchase = await tx.purchase.create({
        data: {
          shopId,
          supplierId: data.supplierId,
          invoiceNumber: data.invoiceNumber,
          items: data.items,
          subtotal: data.subtotal,
          discount: data.discount,
          paidAmount: data.paidAmount,
          dueAmount: dueAmount,
          paymentMode: data.paymentMode,
          notes: data.notes,
        },
      });

      // 2. Update Supplier Due
      if (dueAmount !== 0) {
        await tx.supplier.update({
          where: { id: data.supplierId },
          data: { totalPayable: { increment: dueAmount } },
        });
      }

      // 3. Process each item: update stock, prices, and create inventory movement
      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, shopId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        const beforeQty = product.stockQty;
        const afterQty = beforeQty + item.qty;

        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQty: afterQty,
            defaultPurchasePrice: item.purchasePrice,
            ...(item.sellingPrice ? { defaultSellingPrice: item.sellingPrice } : {}),
          },
        });

        await tx.inventoryMovement.create({
          data: {
            shopId,
            productId: product.id,
            type: 'PURCHASE',
            qty: item.qty,
            beforeQty,
            afterQty,
            referenceType: 'PURCHASE',
            referenceId: purchase.id,
          },
        });
      }

      return purchase;
    });
  }

  async getPurchases(shopId: string) {
    return this.prisma.purchase.findMany({
      where: { shopId },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPurchaseById(shopId: string, purchaseId: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, shopId },
      include: { supplier: true },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');

    const itemsWithNames = await Promise.all(
      (purchase.items as any[]).map(async (item: any) => {
        const product = await this.prisma.product.findFirst({
          where: { id: item.productId },
          select: { name: true, unit: true },
        });
        return { ...item, productName: product?.name || 'Deleted Product', unit: product?.unit || 'PIECES' };
      })
    );

    return { ...purchase, items: itemsWithNames };
  }
}
