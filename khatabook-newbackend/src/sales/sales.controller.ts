import { Controller, Post, Body, Get, Put, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service';
import type { CreateSalesDto } from './dto/create-sales.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSalesTransaction(
    @Req() req: any,
    @Body() createSalesDto: CreateSalesDto,
  ) {
    const result = await this.salesService.createSalesTransaction(req.user.shopId, createSalesDto);
    return { status: 'success', data: result };
  }

  @Get()
  async getSales(@Req() req: any) {
    const result = await this.salesService.getSales(req.user.shopId);
    return { status: 'success', data: result };
  }

  @Get(':id')
  async getSaleById(@Req() req: any, @Param('id') id: string) {
    const result = await this.salesService.getSaleById(req.user.shopId, id);
    return { status: 'success', data: result };
  }

  @Put(':id')
  async editSale(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (!body.reason) throw new BadRequestException('Edit reason is required');
    const result = await this.salesService.editSale(req.user.shopId, id, body);
    return { status: 'success', data: result };
  }

  @Get(':id/edit-history')
  async getEditHistory(@Req() req: any, @Param('id') id: string) {
    const result = await this.salesService.getEditHistory(req.user.shopId, id);
    return { status: 'success', data: result };
  }
}
