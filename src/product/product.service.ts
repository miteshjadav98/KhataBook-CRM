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
    const product = await this.prisma.product.create({
      data: {
        shopId,
        name: data.name,
        price: data.price,
      },
    });

    return product;
  }

  /**
   * Get all products for a shop.
   */
  async getProducts(shopId: string) {
    return this.prisma.product.findMany({
      where: { shopId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update a product.
   */
  async updateProduct(shopId: string, productId: string, data: Partial<CreateProductDto>) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId },
    });

    if (!product) {
      throw new NotFoundException('Product not found in your shop');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data,
    });
  }

  /**
   * Delete a product.
   */
  async deleteProduct(shopId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId },
    });

    if (!product) {
      throw new NotFoundException('Product not found in your shop');
    }

    await this.prisma.product.delete({ where: { id: productId } });
    return { message: 'Product deleted successfully' };
  }
}
