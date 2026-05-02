import {
  Controller, Post, Get, Put, Delete,
  Body, Req, Param, UseGuards, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductSchema } from './dto/create-product.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add a new product to your shop' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'price'],
      properties: {
        name: { type: 'string', example: 'Toor Dal 1kg' },
        price: { type: 'number', example: 150 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Product created, returns product with ID' })
  async create(@Req() req: any, @Body() body: CreateProductDto) {
    const validationResult = CreateProductSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const result = await this.productService.createProduct(req.user.shopId, validationResult.data);

    return { status: 'success', data: result };
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all products in your shop' })
  @ApiResponse({ status: 200, description: 'Array of products with their IDs' })
  async getAll(@Req() req: any) {
    const products = await this.productService.getProducts(req.user.shopId);
    return { status: 'success', data: products };
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Toor Dal 2kg' },
        price: { type: 'number', example: 280 },
      },
    },
  })
  async update(@Req() req: any, @Param('id') id: string, @Body() body: Partial<CreateProductDto>) {
    const result = await this.productService.updateProduct(req.user.shopId, id, body);
    return { status: 'success', data: result };
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  async delete(@Req() req: any, @Param('id') id: string) {
    const result = await this.productService.deleteProduct(req.user.shopId, id);
    return { status: 'success', ...result };
  }
}
