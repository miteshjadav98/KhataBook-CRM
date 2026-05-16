import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, ChangePasswordDto } from './dto/create-customer.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { calculateInterest } from '../utils/interest';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Admin creates a customer under their shop.
   * Password is marked as temporary — customer must change it on first login.
   */
  async createCustomer(shopId: string, data: CreateCustomerDto) {
    console.log('[CustomerService.createCustomer] Called for shopId:', shopId, 'data:', data);

    try {
      // Check if phone or email already exists in this shop (among non-deleted)
      if (data.phone) {
        const existingPhone = await this.prisma.customer.findFirst({
          where: { shopId, phone: data.phone, isDeleted: false },
        });
        if (existingPhone) {
          throw new ConflictException('A customer with this phone number already exists in your shop');
        }
      }

      if (data.email) {
        const existingEmail = await this.prisma.customer.findFirst({
          where: { shopId, email: data.email, isDeleted: false },
        });
        if (existingEmail) {
          throw new ConflictException('A customer with this email already exists in your shop');
        }
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      const customer = await this.prisma.customer.create({
        data: {
          shopId,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          passwordHash,
          isTemporaryPassword: true, // Customer must change password on first login
        },
      });

      console.log('[CustomerService.createCustomer] Customer created:', customer.id, customer.name);

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        totalBalance: customer.totalBalance,
        shopId: customer.shopId,
        isTemporaryPassword: customer.isTemporaryPassword,
        createdAt: customer.createdAt,
      };
    } catch (error) {
      console.error('[CustomerService.createCustomer] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Admin views all customers in their shop (excluding soft-deleted).
   */
  async getCustomersByShop(shopId: string) {
    console.log('[CustomerService.getCustomersByShop] Called for shopId:', shopId);

    try {
      const customers = await this.prisma.customer.findMany({
        where: { shopId, isDeleted: false },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          totalBalance: true,
          isTemporaryPassword: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log('[CustomerService.getCustomersByShop] Found', customers.length, 'customers');
      return customers;
    } catch (error) {
      console.error('[CustomerService.getCustomersByShop] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Get a single customer by ID.
   */
  async getCustomerById(shopId: string, customerId: string) {
    console.log('[CustomerService.getCustomerById] Called for customerId:', customerId);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, shopId, isDeleted: false },
      include: { shop: { select: { name: true, interestRate: true, shopCode: true } } },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      totalBalance: customer.totalBalance,
      isTemporaryPassword: customer.isTemporaryPassword,
      shopId: customer.shopId,
      shopName: customer.shop.name,
      shopCode: customer.shop.shopCode,
      createdAt: customer.createdAt,
    };
  }

  /**
   * Admin updates a customer's details.
   */
  async updateCustomer(shopId: string, customerId: string, data: UpdateCustomerDto) {
    console.log('[CustomerService.updateCustomer] Called for customerId:', customerId);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, shopId, isDeleted: false },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found in your shop');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data,
    });

    console.log('[CustomerService.updateCustomer] Customer updated:', updated.id);
    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      totalBalance: updated.totalBalance,
    };
  }

  /**
   * Admin soft-deletes a customer.
   */
  async deleteCustomer(shopId: string, customerId: string) {
    console.log('[CustomerService.deleteCustomer] Called for customerId:', customerId);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, shopId, isDeleted: false },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found in your shop');
    }

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    console.log('[CustomerService.deleteCustomer] Customer soft-deleted:', customerId);
    return { message: 'Customer deleted successfully' };
  }

  /**
   * Customer logs in with identifier (phone/email) + password + shopCode.
   * Returns isTemporaryPassword flag so frontend can force password change.
   */
  async customerLogin(data: CustomerLoginDto) {
    console.log('[CustomerService.customerLogin] Called for identifier:', data.identifier, 'shopCode:', data.shopCode);

    try {
      // Find the shop by shopCode
      const shop = await this.prisma.shop.findUnique({
        where: { shopCode: data.shopCode },
      });

      if (!shop) {
        console.log('[CustomerService.customerLogin] Shop not found for code:', data.shopCode);
        throw new UnauthorizedException('Invalid Shop Code');
      }

      // Find customer by phone OR email in that shop (not deleted)
      const customer = await this.prisma.customer.findFirst({
        where: {
          shopId: shop.id,
          isDeleted: false,
          OR: [
            { phone: data.identifier },
            { email: data.identifier },
          ],
        },
        include: { shop: true },
      });

      if (!customer) {
        console.log('[CustomerService.customerLogin] Customer not found');
        throw new UnauthorizedException('Invalid email/phone or password');
      }

      const isPasswordValid = await bcrypt.compare(data.password, customer.passwordHash);
      if (!isPasswordValid) {
        console.log('[CustomerService.customerLogin] Invalid password for:', data.identifier);
        throw new UnauthorizedException('Invalid email/phone or password');
      }

      // Generate a customer-specific JWT
      const secret = process.env.JWT_SECRET || 'mjrockseverybody';
      const token = jwt.sign(
        {
          sub: customer.id,
          identifier: data.identifier,
          type: 'CUSTOMER',
          shopId: customer.shopId,
        },
        secret,
        { expiresIn: '7d' },
      );

      console.log('[CustomerService.customerLogin] Login successful for customer:', customer.id);

      return {
        token,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          totalBalance: customer.totalBalance,
          isTemporaryPassword: customer.isTemporaryPassword,
          shopId: customer.shopId,
          shopName: customer.shop.name,
          shopCode: customer.shop.shopCode,
        },
      };
    } catch (error) {
      console.error('[CustomerService.customerLogin] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Customer changes their password.
   * Sets isTemporaryPassword to false and records passwordUpdatedAt.
   */
  async changePassword(customerId: string, data: ChangePasswordDto) {
    console.log('[CustomerService.changePassword] Called for customerId:', customerId);

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const isPasswordValid = await bcrypt.compare(data.oldPassword, customer.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(data.newPassword, 10);

    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        passwordHash: newHash,
        isTemporaryPassword: false,
        passwordUpdatedAt: new Date(),
      },
    });

    console.log('[CustomerService.changePassword] Password changed for customer:', customerId);
    return { message: 'Password changed successfully' };
  }

  /**
   * Customer views their own balance and info.
   */
  async getMyBalance(customerId: string) {
    console.log('[CustomerService.getMyBalance] Called for customerId:', customerId);

    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        include: { shop: { select: { name: true, interestRate: true } } },
      });

      if (!customer) {
        console.log('[CustomerService.getMyBalance] Customer not found:', customerId);
        throw new NotFoundException('Customer not found');
      }

      console.log('[CustomerService.getMyBalance] Balance:', customer.totalBalance);

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalBalance: customer.totalBalance,
        balanceStatus: customer.totalBalance <= 0 ? 'CLEAR' : 'DUE',
        amountOwed: customer.totalBalance > 0 ? customer.totalBalance : 0,
        shopName: customer.shop.name,
        shopInterestRate: customer.shop.interestRate,
      };
    } catch (error) {
      console.error('[CustomerService.getMyBalance] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Customer views their own transaction history with interest calculations.
   */
  async getMyTransactions(customerId: string, page: number = 1, limit: number = 10) {
    console.log('[CustomerService.getMyTransactions] Called for customerId:', customerId, 'page:', page);

    try {
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where: { customerId },
          include: { product: { select: { name: true, price: true } } },
          orderBy: { transactionDate: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.transaction.count({ where: { customerId } }),
      ]);

      // Enrich with interest calculations for DUE transactions
      const enriched = transactions.map((tx) => {
        if (tx.status === 'DUE' && tx.remainingAmount > 0 && tx.dueDate) {
          const interest = calculateInterest(
            tx.remainingAmount,
            tx.dueDate,
            tx.interestRate || undefined,
          );
          return {
            ...tx,
            calculatedInterest: interest.interestAmount,
            totalWithInterest: interest.totalWithInterest,
            monthsOverdue: interest.monthsOverdue,
          };
        }
        return tx;
      });

      console.log('[CustomerService.getMyTransactions] Found', transactions.length, 'of', total, 'total');

      return {
        data: enriched,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('[CustomerService.getMyTransactions] ERROR:', error.message || error);
      throw error;
    }
  }
}
