import {
  Controller, Post, Get, Body, Req, Query,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CreateCustomerSchema } from './dto/create-customer.dto';
import { CustomerLoginSchema } from './dto/customer-login.dto';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { CustomerLoginDto } from './dto/customer-login.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  // ─── ADMIN ENDPOINTS ──────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Add a new customer to your shop' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'phone', 'password'],
      properties: {
        name: { type: 'string', example: 'Rahul Sharma' },
        phone: { type: 'string', example: '9876543210' },
        password: { type: 'string', example: 'cust123', description: 'Password for the customer to log in' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiResponse({ status: 409, description: 'Customer with this phone already exists in shop' })
  async createCustomer(@Req() req: any, @Body() body: CreateCustomerDto) {
    const validationResult = CreateCustomerSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const shopId = req.user.shopId;
    const result = await this.customerService.createCustomer(shopId, validationResult.data);

    return {
      status: 'success',
      message: 'Customer added successfully',
      data: result,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: View all customers in your shop' })
  @ApiResponse({ status: 200, description: 'List of all customers' })
  async getCustomers(@Req() req: any) {
    const shopId = req.user.shopId;
    const customers = await this.customerService.getCustomersByShop(shopId);

    return {
      status: 'success',
      data: customers,
    };
  }

  // ─── CUSTOMER AUTH ────────────────────────────────────

  @Post('login')
  @ApiOperation({ summary: 'Customer: Login with phone, password, and shopId' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone', 'password', 'shopId'],
      properties: {
        phone: { type: 'string', example: '9876543210' },
        password: { type: 'string', example: 'cust123' },
        shopId: { type: 'string', example: 'uuid-of-shop', description: 'The shop ID (given by shopkeeper)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Login successful, returns token and balance' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async customerLogin(@Body() body: CustomerLoginDto) {
    const validationResult = CustomerLoginSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const result = await this.customerService.customerLogin(validationResult.data);

    return {
      status: 'success',
      message: 'Login successful',
      data: result,
    };
  }

  // ─── CUSTOMER SELF-SERVICE ────────────────────────────

  @Get('me/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer: View my outstanding balance' })
  @ApiResponse({ status: 200, description: 'Returns customer balance and shop info' })
  async getMyBalance(@Req() req: any) {
    // The JWT for customers has type='CUSTOMER' and sub=customerId
    const customerId = req.user.sub;
    const result = await this.customerService.getMyBalance(customerId);

    return {
      status: 'success',
      data: result,
    };
  }

  @Get('me/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer: View my transaction history' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Paginated list of customer transactions' })
  async getMyTransactions(
    @Req() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const customerId = req.user.sub;
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;

    const result = await this.customerService.getMyTransactions(customerId, pageNumber, limitNumber);

    return {
      status: 'success',
      ...result,
    };
  }
}
