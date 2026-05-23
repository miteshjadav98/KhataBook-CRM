import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  /**
   * Admin adds a product to their shop.
   */
  async createProduct(shopId: string, data: CreateProductDto) {
    console.log('[ProductService.createProduct] Called for shopId:', shopId, 'product:', data.name);

    try {
      const product = await this.prisma.product.create({
        data: {
          shopId,
          name: data.name,
          sku: data.sku,
          barcode: data.barcode,
          category: data.category,
          stockQty: data.stockQty ?? 0,
          defaultPurchasePrice: data.defaultPurchasePrice ?? 0,
          defaultSellingPrice: data.defaultSellingPrice ?? 0,
          lowStockThreshold: data.lowStockThreshold ?? 10,
          unit: data.unit ?? 'PIECES',
        },
      });

      console.log('[ProductService.createProduct] Product created:', product.id, product.name);
      return product;
    } catch (error) {
      console.error('[ProductService.createProduct] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Get all products for a shop (excluding soft-deleted).
   */
  async getProducts(shopId: string) {
    console.log('[ProductService.getProducts] Called for shopId:', shopId);

    try {
      const products = await this.prisma.product.findMany({
        where: { shopId, isDeleted: false },
        orderBy: { name: 'asc' },
      });

      console.log('[ProductService.getProducts] Found', products.length, 'products');
      return products;
    } catch (error) {
      console.error('[ProductService.getProducts] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Get a single product by ID with inventory movement history.
   */
  async getProductWithHistory(shopId: string, productId: string) {
    console.log('[ProductService.getProductWithHistory] Called for productId:', productId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId, isDeleted: false },
    });

    if (!product) {
      throw new NotFoundException('Product not found in your shop');
    }

    const movements = await this.prisma.inventoryMovement.findMany({
      where: { productId, shopId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Calculate margin
    const margin = product.defaultSellingPrice - product.defaultPurchasePrice;
    const marginPercent = product.defaultPurchasePrice > 0 
      ? ((margin / product.defaultPurchasePrice) * 100).toFixed(1) 
      : '0';

    return {
      ...product,
      margin,
      marginPercent,
      movements,
    };
  }

  /**
   * Update a product.
   */
  async updateProduct(shopId: string, productId: string, data: Partial<CreateProductDto>) {
    console.log('[ProductService.updateProduct] Called for productId:', productId);

    try {
      const product = await this.prisma.product.findFirst({
        where: { id: productId, shopId, isDeleted: false },
      });

      if (!product) {
        console.log('[ProductService.updateProduct] Product not found:', productId);
        throw new NotFoundException('Product not found in your shop');
      }

      const updated = await this.prisma.product.update({
        where: { id: productId },
        data: {
          name: data.name,
          sku: data.sku,
          barcode: data.barcode,
          category: data.category,
          stockQty: data.stockQty,
          defaultPurchasePrice: data.defaultPurchasePrice,
          defaultSellingPrice: data.defaultSellingPrice,
          lowStockThreshold: data.lowStockThreshold,
          unit: data.unit,
        },
      });

      console.log('[ProductService.updateProduct] Product updated:', updated.id);
      return updated;
    } catch (error) {
      console.error('[ProductService.updateProduct] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Soft delete a product.
   */
  async deleteProduct(shopId: string, productId: string) {
    console.log('[ProductService.deleteProduct] Called for productId:', productId);

    try {
      const product = await this.prisma.product.findFirst({
        where: { id: productId, shopId, isDeleted: false },
      });

      if (!product) {
        console.log('[ProductService.deleteProduct] Product not found:', productId);
        throw new NotFoundException('Product not found in your shop');
      }

      await this.prisma.product.update({
        where: { id: productId },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      console.log('[ProductService.deleteProduct] Product soft-deleted:', productId);
      return { message: 'Product deleted successfully' };
    } catch (error) {
      console.error('[ProductService.deleteProduct] ERROR:', error.message || error);
      throw error;
    }
  }
}
