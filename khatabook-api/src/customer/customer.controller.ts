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
  @ApiOperation({ summary: 'Customer: Login with phone/email and password. Returns shops list or auto-logs in.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['identifier', 'password'],
      properties: {
        identifier: { type: 'string', example: '9876543210', description: 'Phone or Email' },
        password: { type: 'string', example: 'cust123' },
        shopId: { type: 'string', description: 'Optional: specific shop to login to' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Login successful or returns list of shops' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async customerLogin(@Body() body: CustomerLoginDto) {
    const validationResult = CustomerLoginSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const result = await this.customerService.customerLogin(validationResult.data);

    // If multiple shops returned
    if ((result as any).multipleShops) {
      return {
        status: 'success',
        ...result,
      };
    }

    return {
      status: 'success',
      message: (result as any).customer?.isTemporaryPassword
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

  @Get('me/ledger')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer: View my ledger (Sales and Payments)' })
  @ApiResponse({ status: 200, description: 'List of sales and payments' })
  async getCustomerLedger(@Req() req: any) {
    const customerId = req.user.sub;
    const result = await this.customerService.getCustomerLedger(customerId);

    return {
      status: 'success',
      data: result,
    };
  }

  @Get('me/sale/:saleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer: View a specific sale invoice (abstract view)' })
  @ApiParam({ name: 'saleId', description: 'Sale Transaction ID' })
  async getCustomerSaleDetail(@Req() req: any, @Param('saleId') saleId: string) {
    const customerId = req.user.sub;
    const result = await this.customerService.getCustomerSaleDetail(customerId, saleId);

    return {
      status: 'success',
      data: result,
    };
  }

  @Get('me/shops')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer: View all shops where my account is registered' })
  @ApiResponse({ status: 200, description: 'List of all shops linked to customer account' })
  async getMyShops(@Req() req: any) {
    const identifier = req.user.identifier;
    const shops = await this.customerService.getMyShops(identifier);

    return {
      status: 'success',
      data: shops,
    };
  }

  @Post('me/switch-shop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer: Switch to a different shop they are registered with' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['shopId'],
      properties: {
        shopId: { type: 'string', description: 'ID of the shop to switch to' },
      },
    },
  })
  async switchShop(@Req() req: any, @Body() body: { shopId: string }) {
    if (!body.shopId) {
      throw new BadRequestException('shopId is required');
    }
    const identifier = req.user.identifier;
    const result = await this.customerService.switchShop(identifier, body.shopId);
    return {
      status: 'success',
      message: 'Switched shop successfully',
      data: result,
    };
  }
}
