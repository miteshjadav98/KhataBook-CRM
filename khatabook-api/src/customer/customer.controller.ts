import {
  Controller, Post, Get, Put, Delete, Body, Req, Param, Query,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CreateCustomerSchema, UpdateCustomerSchema, ChangePasswordSchema } from './dto/create-customer.dto';
import { CustomerLoginSchema } from './dto/customer-login.dto';
import type { CreateCustomerDto, UpdateCustomerDto, ChangePasswordDto } from './dto/create-customer.dto';
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
      required: ['name', 'password'],
      properties: {
        name: { type: 'string', example: 'Rahul Sharma' },
        phone: { type: 'string', example: '9876543210' },
        email: { type: 'string', example: 'rahul@example.com' },
        password: { type: 'string', example: 'cust123', description: 'Temporary password for the customer' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Customer created with temporary password' })
  @ApiResponse({ status: 409, description: 'Customer with this phone or email already exists in shop' })
  async createCustomer(@Req() req: any, @Body() body: CreateCustomerDto) {
    const validationResult = CreateCustomerSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const shopId = req.user.shopId;
    const result = await this.customerService.createCustomer(shopId, validationResult.data);

    return {
      status: 'success',
      message: 'Customer added successfully with temporary password',
      data: result,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: View all customers in your shop' })
  @ApiResponse({ status: 200, description: 'List of all active customers' })
  async getCustomers(@Req() req: any) {
    const shopId = req.user.shopId;
    const customers = await this.customerService.getCustomersByShop(shopId);

    return {
      status: 'success',
      data: customers,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: View a single customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer details' })
  async getCustomerById(@Req() req: any, @Param('id') id: string) {
    const shopId = req.user.shopId;
    const customer = await this.customerService.getCustomerById(shopId, id);

    return {
      status: 'success',
      data: customer,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Update a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Rahul Kumar' },
        phone: { type: 'string', example: '9876543211' },
        email: { type: 'string', example: 'rahul.new@example.com' },
      },
    },
  })
  async updateCustomer(@Req() req: any, @Param('id') id: string, @Body() body: UpdateCustomerDto) {
    const validationResult = UpdateCustomerSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const result = await this.customerService.updateCustomer(req.user.shopId, id, validationResult.data);
    return { status: 'success', data: result };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Soft delete a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  async deleteCustomer(@Req() req: any, @Param('id') id: string) {
    const result = await this.customerService.deleteCustomer(req.user.shopId, id);
    return { status: 'success', ...result };
  }

  // ─── CUSTOMER AUTH ────────────────────────────────────

  @Post('login')
  @ApiOperation({ summary: 'Customer: Login with phone/email, password, and shopCode' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['identifier', 'password', 'shopCode'],
      properties: {
        identifier: { type: 'string', example: '9876543210', description: 'Phone or Email' },
        password: { type: 'string', example: 'cust123' },
        shopCode: { type: 'string', example: 'MTS-363', description: 'The short shop code' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Login successful. Check isTemporaryPassword to force password change.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async customerLogin(@Body() body: CustomerLoginDto) {
    const validationResult = CustomerLoginSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const result = await this.customerService.customerLogin(validationResult.data);

    return {
      status: 'success',
      message: result.customer.isTemporaryPassword
        ? 'Login successful. Please change your temporary password.'
        : 'Login successful',
      data: result,
    };
  }

  // ─── CUSTOMER SELF-SERVICE ────────────────────────────

  @Post('me/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer: Change password (required on first login)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['oldPassword', 'newPassword'],
      properties: {
        oldPassword: { type: 'string', example: 'cust123' },
        newPassword: { type: 'string', example: 'myNewSecurePass' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Password changed successfully' })
  async changePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    const validationResult = ChangePasswordSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const customerId = req.user.sub;
    const result = await this.customerService.changePassword(customerId, validationResult.data);

    return {
      status: 'success',
      ...result,
    };
  }

  @Get('me/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer: View my outstanding balance (Bakaya)' })
  @ApiResponse({ status: 200, description: 'Returns customer balance and shop info' })
  async getMyBalance(@Req() req: any) {
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
  @ApiOperation({ summary: 'Customer: View my transaction history (Khata)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Paginated list of customer transactions with interest' })
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
