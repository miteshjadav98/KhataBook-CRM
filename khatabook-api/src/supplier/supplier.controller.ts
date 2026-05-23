import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import type { CreateSupplierDto } from './dto/create-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('supplier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  async createSupplier(
    @Req() req: any,
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    const result = await this.supplierService.createSupplier(req.user.shopId, createSupplierDto);
    return { status: 'success', data: result };
  }

  @Get()
  async getSuppliers(@Req() req: any) {
    const result = await this.supplierService.getSuppliers(req.user.shopId);
    return { status: 'success', data: result };
  }

  @Get(':supplierId')
  async getSupplierById(
    @Req() req: any,
    @Param('supplierId') supplierId: string,
  ) {
    const result = await this.supplierService.getSupplierById(req.user.shopId, supplierId);
    return { status: 'success', data: result };
  }

  @Get(':supplierId/ledger')
  async getSupplierLedger(
    @Req() req: any,
    @Param('supplierId') supplierId: string,
  ) {
    const result = await this.supplierService.getSupplierLedger(req.user.shopId, supplierId);
    return { status: 'success', data: result };
  }
}
