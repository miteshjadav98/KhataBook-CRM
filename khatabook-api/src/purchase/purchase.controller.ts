import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import type { CreatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('purchase')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  async createPurchase(
    @Req() req: any,
    @Body() createPurchaseDto: CreatePurchaseDto,
  ) {
    const result = await this.purchaseService.createPurchase(req.user.shopId, createPurchaseDto);
    return { status: 'success', data: result };
  }

  @Get()
  async getPurchases(@Req() req: any) {
    const result = await this.purchaseService.getPurchases(req.user.shopId);
    return { status: 'success', data: result };
  }

  @Get(':id')
  async getPurchaseById(@Req() req: any, @Param('id') id: string) {
    const result = await this.purchaseService.getPurchaseById(req.user.shopId, id);
    return { status: 'success', data: result };
  }
}
