import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Admin creates a customer under their shop.
   */
  async createCustomer(shopId: string, data: CreateCustomerDto) {
    // Check if phone already exists in this shop
    const existing = await this.prisma.customer.findUnique({
      where: { shopId_phone: { shopId, phone: data.phone } },
    });

    if (existing) {
      throw new ConflictException('A customer with this phone number already exists in your shop');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const customer = await this.prisma.customer.create({
      data: {
        shopId,
        name: data.name,
        phone: data.phone,
        passwordHash,
      },
    });

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      totalBalance: customer.totalBalance,
      shopId: customer.shopId,
      createdAt: customer.createdAt,
    };
  }

  /**
   * Admin views all customers in their shop.
   */
  async getCustomersByShop(shopId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { shopId },
      select: {
        id: true,
        name: true,
        phone: true,
        totalBalance: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers;
  }

  /**
   * Customer logs in with phone + password + shopId.
   */
  async customerLogin(data: CustomerLoginDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { shopId_phone: { shopId: data.shopId, phone: data.phone } },
      include: { shop: true },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const isPasswordValid = await bcrypt.compare(data.password, customer.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    // Generate a customer-specific JWT
    const secret = process.env.JWT_SECRET || 'mjrockseverybody';
    const token = jwt.sign(
      {
        sub: customer.id,
        phone: customer.phone,
        type: 'CUSTOMER',
        shopId: customer.shopId,
      },
      secret,
      { expiresIn: '7d' },
    );

    return {
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalBalance: customer.totalBalance,
        shopId: customer.shopId,
        shopName: customer.shop.name,
      },
    };
  }

  /**
   * Customer views their own balance and info.
   */
  async getMyBalance(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { shop: { select: { name: true, interestRate: true } } },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      totalBalance: customer.totalBalance,
      balanceStatus: customer.totalBalance >= 0 ? 'CLEAR' : 'OUTSTANDING',
      amountOwed: customer.totalBalance < 0 ? Math.abs(customer.totalBalance) : 0,
      shopName: customer.shop.name,
      shopInterestRate: customer.shop.interestRate,
    };
  }

  /**
   * Customer views their own transaction history.
   */
  async getMyTransactions(customerId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { customerId },
        include: { product: { select: { name: true, price: true } } },
        orderBy: { purchaseDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { customerId } }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
