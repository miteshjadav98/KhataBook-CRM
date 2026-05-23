import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async createPayment(
    @Req() req: any,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    const result = await this.paymentService.createPayment(req.user.shopId, createPaymentDto);
    return { status: 'success', data: result };
  }

  @Get()
  async getPayments(@Req() req: any) {
    const result = await this.paymentService.getPayments(req.user.shopId);
    return { status: 'success', data: result };
  }
}
