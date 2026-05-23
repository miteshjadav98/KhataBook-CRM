import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesDto } from './dto/create-sales.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSalesTransaction(shopId: string, data: CreateSalesDto) {
    console.log('[SalesService.createSalesTransaction] shopId:', shopId, data);
    
    // Ensure customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, shopId, isDeleted: false },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalProfit = 0;
      const salesItems = [];
      const inventoryMovementsData = [];

      // 1. Process items, check stock, calculate profit
      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, shopId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        if (product.stockQty < item.qty) {
          throw new BadRequestException(`Insufficient stock for product: ${product.name}. Available: ${product.stockQty}`);
        }

        const totalItemPrice = item.qty * item.sellingPrice;
        subtotal += totalItemPrice;
        
        const purchasePriceSnapshot = product.defaultPurchasePrice;
        const profit = (item.sellingPrice - purchasePriceSnapshot) * item.qty;
        totalProfit += profit;

        salesItems.push({
          productId: product.id,
          qty: item.qty,
          purchasePriceSnapshot,
          sellingPrice: item.sellingPrice,
          total: totalItemPrice,
        });

        const beforeQty = product.stockQty;
        const afterQty = beforeQty - item.qty;

        // Decrease stock
        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: afterQty },
        });

        // Store inventory movement data to be created after salesTx is created
        inventoryMovementsData.push({
          shopId,
          productId: product.id,
          type: 'SALE' as const,
          qty: item.qty,
          beforeQty,
          afterQty,
          referenceType: 'SALE' as const,
        });
      }

      const dueAmount = subtotal - data.discount - data.paidAmount;

      // 2. Create the Sales Transaction record
      const salesTx = await tx.salesTransaction.create({
        data: {
          shopId,
          customerId: data.customerId,
          invoiceNumber: data.invoiceNumber,
          items: salesItems,
          subtotal,
          discount: data.discount,
          paidAmount: data.paidAmount,
          dueAmount,
          paymentMode: data.paymentMode,
          profit: totalProfit - data.discount,
          notes: data.notes,
        },
      });

      // 3. Create Inventory Movements with proper referenceId
      for (const movement of inventoryMovementsData) {
        await tx.inventoryMovement.create({
          data: {
            ...movement,
            referenceId: salesTx.id,
          },
        });
      }

      // 3. Update Customer Due (Receivable)
      if (dueAmount !== 0) {
        await tx.customer.update({
          where: { id: data.customerId },
          data: { totalReceivable: { increment: dueAmount } },
        });
      }

      return salesTx;
    });
  }

  async getSales(shopId: string) {
    return this.prisma.salesTransaction.findMany({
      where: { shopId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSaleById(shopId: string, saleId: string) {
    const sale = await this.prisma.salesTransaction.findFirst({
      where: { id: saleId, shopId },
      include: { customer: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');

    // Resolve product names for each item
    const itemsWithNames = await Promise.all(
      (sale.items as any[]).map(async (item: any) => {
        const product = await this.prisma.product.findFirst({
          where: { id: item.productId },
          select: { name: true, unit: true },
        });
        return { ...item, productName: product?.name || 'Deleted Product', unit: product?.unit || 'PIECES' };
      })
    );

    return { ...sale, items: itemsWithNames };
  }

  async editSale(shopId: string, saleId: string, data: { invoiceNumber?: string; discount?: number; notes?: string; reason: string }) {
    const sale = await this.prisma.salesTransaction.findFirst({
      where: { id: saleId, shopId },
    });
    if (!sale) throw new NotFoundException('Sale not found');

    // Check 24-hour window for financial edits
    const hoursSinceCreation = (Date.now() - new Date(sale.createdAt).getTime()) / (1000 * 60 * 60);
    const isFinancialEdit = data.discount !== undefined && data.discount !== sale.discount;

    if (isFinancialEdit && hoursSinceCreation > 24) {
      throw new BadRequestException('Financial edits are only allowed within 24 hours of creation');
    }

    // Build changes summary
    const changes: string[] = [];
    if (data.invoiceNumber !== undefined && data.invoiceNumber !== sale.invoiceNumber) {
      changes.push(`Invoice: ${sale.invoiceNumber || '—'} → ${data.invoiceNumber || '—'}`);
    }
    if (data.discount !== undefined && data.discount !== sale.discount) {
      changes.push(`Discount: ₹${sale.discount} → ₹${data.discount}`);
    }
    if (data.notes !== undefined && data.notes !== sale.notes) {
      changes.push(`Notes updated`);
    }

    const beforeSnapshot = { ...sale };

    // Calculate new values
    const newDiscount = data.discount !== undefined ? data.discount : sale.discount;
    const newDueAmount = sale.subtotal - newDiscount - sale.paidAmount;
    const dueDifference = newDueAmount - sale.dueAmount;

    return this.prisma.$transaction(async (tx) => {
      // Update the sale
      const updated = await tx.salesTransaction.update({
        where: { id: saleId },
        data: {
          invoiceNumber: data.invoiceNumber !== undefined ? data.invoiceNumber : sale.invoiceNumber,
          discount: newDiscount,
          dueAmount: newDueAmount,
          notes: data.notes !== undefined ? data.notes : sale.notes,
          lastEditedAt: new Date(),
          editCount: { increment: 1 },
          lastEditReason: data.reason,
        },
      });

      // Adjust customer due if financial values changed
      if (dueDifference !== 0) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { totalReceivable: { increment: dueDifference } },
        });
      }

      // Create audit log
      await tx.invoiceEditLog.create({
        data: {
          invoiceId: saleId,
          invoiceType: 'SALE',
          shopId,
          reason: data.reason,
          changesSummary: changes.length > 0 ? changes.join(', ') : 'No changes',
          beforeSnapshot,
          afterSnapshot: updated,
        },
      });

      return updated;
    });
  }

  async getEditHistory(shopId: string, invoiceId: string) {
    return this.prisma.invoiceEditLog.findMany({
      where: { invoiceId, shopId },
      orderBy: { editedAt: 'desc' },
    });
  }
}
