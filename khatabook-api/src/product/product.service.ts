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
          price: data.price,
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
   * Get a single product by ID.
   */
  async getProductById(shopId: string, productId: string) {
    console.log('[ProductService.getProductById] Called for productId:', productId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId, isDeleted: false },
    });

    if (!product) {
      throw new NotFoundException('Product not found in your shop');
    }

    return product;
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
        data,
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
