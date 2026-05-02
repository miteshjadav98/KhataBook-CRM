import { Controller, Post, Body, Req, UseGuards, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { CreateTransactionSchema } from './dto/create-transaction.dto';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Create a new transaction (credit or debit)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['customerId', 'amount', 'type'],
      properties: {
        customerId: { type: 'string', example: 'uuid-of-customer' },
        productId: { type: 'string', example: 'uuid-of-product', nullable: true },
        amount: { type: 'number', example: 500 },
        type: { type: 'string', enum: ['CREDIT', 'DEBIT'], example: 'CREDIT' },
        dueDate: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async create(@Req() req: any, @Body() createTransactionDto: CreateTransactionDto) {
    // Validate with Zod
    const validationResult = CreateTransactionSchema.safeParse(createTransactionDto);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const shopId = req.user.shopId; // Extracted from JWT
    const result = await this.transactionService.createTransaction(shopId, validationResult.data);
    
    return {
      status: 'success',
      data: result,
    };
  }

  @Get('customer/:customerId')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get all transactions for a customer' })
  @ApiParam({ name: 'customerId', description: 'UUID of the customer' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'List of transactions with pagination' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCustomerTransactions(
    @Req() req: any,
    @Param('customerId') customerId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const shopId = req.user.shopId;
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;

    const result = await this.transactionService.getTransactions(shopId, customerId, pageNumber, limitNumber);
    
    return {
      status: 'success',
      ...result,
    };
  }
}
