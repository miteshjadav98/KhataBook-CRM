import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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
   * Get all products for a shop.
   */
  async getProducts(shopId: string) {
    console.log('[ProductService.getProducts] Called for shopId:', shopId);

    try {
      const products = await this.prisma.product.findMany({
        where: { shopId },
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
   * Update a product.
   */
  async updateProduct(shopId: string, productId: string, data: Partial<CreateProductDto>) {
    console.log('[ProductService.updateProduct] Called for productId:', productId);

    try {
      const product = await this.prisma.product.findFirst({
        where: { id: productId, shopId },
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
   * Delete a product.
   */
  async deleteProduct(shopId: string, productId: string) {
    console.log('[ProductService.deleteProduct] Called for productId:', productId);

    try {
      const product = await this.prisma.product.findFirst({
        where: { id: productId, shopId },
      });

      if (!product) {
        console.log('[ProductService.deleteProduct] Product not found:', productId);
        throw new NotFoundException('Product not found in your shop');
      }

      await this.prisma.product.delete({ where: { id: productId } });
      console.log('[ProductService.deleteProduct] Product deleted:', productId);
      return { message: 'Product deleted successfully' };
    } catch (error) {
      console.error('[ProductService.deleteProduct] ERROR:', error.message || error);
      throw error;
    }
  }
}
