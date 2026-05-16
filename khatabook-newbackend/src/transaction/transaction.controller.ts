import { Controller, Post, Body, Req, UseGuards, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { CreateTransactionSchema } from './dto/create-transaction.dto';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TxStatus } from '@prisma/client';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Create a new transaction (Udhar or Jama)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['customerId', 'totalAmount', 'type'],
      properties: {
        customerId: { type: 'string', example: 'uuid-of-customer' },
        productId: { type: 'string', example: 'uuid-of-product', nullable: true },
        type: { type: 'string', enum: ['UDHAR', 'JAMA'], example: 'UDHAR' },
        totalAmount: { type: 'number', example: 1500, description: 'Full bill amount' },
        paidAmount: { type: 'number', example: 1200, description: 'Amount paid now (for UDHAR)' },
        discountAmount: { type: 'number', example: 0, description: 'Discount given (for UDHAR)' },
        dueDate: { type: 'string', format: 'date-time', nullable: true },
        interestRate: { type: 'number', example: 3, description: 'Monthly interest rate (%)' },
        description: { type: 'string', example: 'Toor Dal 2kg', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Transaction created, balance updated' })
  async create(@Req() req: any, @Body() body: CreateTransactionDto) {
    const validationResult = CreateTransactionSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const shopId = req.user.shopId;
    const result = await this.transactionService.createTransaction(shopId, validationResult.data);

    return {
      status: 'success',
      message: result.transaction.type === 'UDHAR'
        ? `उधार (Udhar) recorded. Remaining: ₹${result.transaction.remainingAmount}`
        : `जमा (Jama) recorded. ₹${result.transaction.totalAmount} received.`,
      data: result,
    };
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get all transactions with filters' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer' })
  @ApiQuery({ name: 'productId', required: false, description: 'Filter by product' })
  @ApiQuery({ name: 'status', required: false, enum: ['PAID', 'DUE', 'OVERDUE'], description: 'Filter by status' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getTransactions(
    @Req() req: any,
    @Query('customerId') customerId?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const shopId = req.user.shopId;
    const result = await this.transactionService.getTransactions(shopId, {
      customerId,
      productId,
      status: status as TxStatus,
      startDate,
      endDate,
      page: parseInt(page || '1') || 1,
      limit: parseInt(limit || '10') || 10,
    });

    return {
      status: 'success',
      ...result,
    };
  }

  @Get('customer/:customerId/ledger')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get full ledger view for a customer (Khata)' })
  @ApiParam({ name: 'customerId', description: 'UUID of the customer' })
  @ApiResponse({ status: 200, description: 'Full ledger with running balance, interest, and summary' })
  async getCustomerLedger(
    @Req() req: any,
    @Param('customerId') customerId: string,
  ) {
    const shopId = req.user.shopId;
    const result = await this.transactionService.getCustomerLedger(shopId, customerId);

    return {
      status: 'success',
      ...result,
    };
  }

  @Get('dashboard')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get dashboard metrics (Total Due, Collected, Overdue, Monthly Revenue)' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics for the shop' })
  async getDashboard(@Req() req: any) {
    const shopId = req.user.shopId;
    const result = await this.transactionService.getDashboardMetrics(shopId);

    return {
      status: 'success',
      data: result,
    };
  }
}
