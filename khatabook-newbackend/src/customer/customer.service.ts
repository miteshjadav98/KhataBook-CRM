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

      // Check if this customer already exists globally under another shop
      let existingGlobalCustomer = null;
      if (data.phone) {
        existingGlobalCustomer = await this.prisma.customer.findFirst({
          where: { phone: data.phone, isDeleted: false },
        });
      }
      if (!existingGlobalCustomer && data.email) {
        existingGlobalCustomer = await this.prisma.customer.findFirst({
          where: { email: data.email, isDeleted: false },
        });
      }

      let passwordHash: string;
      let isTemporaryPassword = true;
      let passwordUpdatedAt = null;

      if (existingGlobalCustomer) {
        console.log('[CustomerService.createCustomer] Reusing password credentials from global customer:', existingGlobalCustomer.id);
        passwordHash = existingGlobalCustomer.passwordHash || '';
        isTemporaryPassword = existingGlobalCustomer.isTemporaryPassword;
        passwordUpdatedAt = existingGlobalCustomer.passwordUpdatedAt;
      } else {
        passwordHash = await bcrypt.hash(data.password, 10);
      }

      const customer = await this.prisma.customer.create({
        data: {
          shopId,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          passwordHash,
          isTemporaryPassword,
          passwordUpdatedAt,
        },
      });

      console.log('[CustomerService.createCustomer] Customer created:', customer.id, customer.name);

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        totalReceivable: customer.totalReceivable,
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
          totalReceivable: true,
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
      totalReceivable: customer.totalReceivable,
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
      totalReceivable: updated.totalReceivable,
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
   * Customer logs in with identifier (phone/email) + password.
   * If shopId is provided, login to that specific shop.
   * If not, find all shops where customer exists and return list (or auto-login if only 1).
   */
  async customerLogin(data: CustomerLoginDto) {
    console.log('[CustomerService.customerLogin] Called for identifier:', data.identifier);

    try {
      // Find ALL customer records matching this identifier across all shops
      const customers = await this.prisma.customer.findMany({
        where: {
          isDeleted: false,
          OR: [
            { phone: data.identifier },
            { email: data.identifier },
          ],
        },
        include: { shop: { select: { id: true, name: true, shopCode: true } } },
      });

      if (customers.length === 0) {
        throw new UnauthorizedException('Invalid email/phone or password');
      }

      // Verify password against the first match (all records for same person should share password)
      let validCustomer = null;
      for (const cust of customers) {
        const isValid = await bcrypt.compare(data.password, cust.passwordHash || '');
        if (isValid) {
          validCustomer = cust;
          break;
        }
      }

      if (!validCustomer) {
        throw new UnauthorizedException('Invalid email/phone or password');
      }

      // If shopId is specified, find that specific customer record
      if (data.shopId) {
        const targetCustomer = customers.find(c => c.shopId === data.shopId);
        if (!targetCustomer) {
          throw new UnauthorizedException('You are not registered with this shop');
        }

        // Verify password for this specific record
        const isPasswordValid = await bcrypt.compare(data.password, targetCustomer.passwordHash || '');
        if (!isPasswordValid) {
          throw new UnauthorizedException('Invalid email/phone or password');
        }

        return this.generateCustomerToken(targetCustomer);
      }

      // No shopId specified — check how many shops
      if (customers.length === 1) {
        // Only one shop → auto-login
        return this.generateCustomerToken(validCustomer);
      }

      // Multiple shops → return shop list for selection
      const shops = customers.map(c => ({
        shopId: c.shopId,
        shopName: c.shop.name,
        shopCode: c.shop.shopCode,
        totalReceivable: c.totalReceivable,
        customerName: c.name,
      }));

      return {
        multipleShops: true,
        shops,
        message: 'Multiple shops found. Please select a shop.',
      };
    } catch (error) {
      console.error('[CustomerService.customerLogin] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Helper: Generate JWT token for a specific customer record.
   */
  private generateCustomerToken(customer: any) {
    const secret = process.env.JWT_SECRET || 'mjrockseverybody';
    const token = jwt.sign(
      {
        sub: customer.id,
        identifier: customer.phone || customer.email,
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
        totalReceivable: customer.totalReceivable,
        isTemporaryPassword: customer.isTemporaryPassword,
        shopId: customer.shopId,
        shopName: customer.shop.name,
        shopCode: customer.shop.shopCode,
      },
    };
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

    const isPasswordValid = await bcrypt.compare(data.oldPassword, customer.passwordHash || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(data.newPassword, 10);

    // Sync password on all customer accounts with the same email or phone number
    const orConditions = [];
    if (customer.phone) {
      orConditions.push({ phone: customer.phone });
    }
    if (customer.email) {
      orConditions.push({ email: customer.email });
    }

    if (orConditions.length > 0) {
      const samePersonCustomers = await this.prisma.customer.findMany({
        where: {
          isDeleted: false,
          OR: orConditions,
        },
      });

      const customerIds = samePersonCustomers.map(c => c.id);

      await this.prisma.customer.updateMany({
        where: { id: { in: customerIds } },
        data: {
          passwordHash: newHash,
          isTemporaryPassword: false,
          passwordUpdatedAt: new Date(),
        },
      });
      console.log('[CustomerService.changePassword] Password changed and synced for customer IDs:', customerIds);
    } else {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          passwordHash: newHash,
          isTemporaryPassword: false,
          passwordUpdatedAt: new Date(),
        },
      });
      console.log('[CustomerService.changePassword] Password changed for single customer ID:', customerId);
    }

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

      console.log('[CustomerService.getMyBalance] Balance:', customer.totalReceivable);

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalReceivable: customer.totalReceivable,
        balanceStatus: customer.totalReceivable <= 0 ? 'CLEAR' : 'DUE',
        amountOwed: customer.totalReceivable > 0 ? customer.totalReceivable : 0,
        shopName: customer.shop.name,
        shopInterestRate: customer.shop.interestRate,
      };
    } catch (error) {
      console.error('[CustomerService.getMyBalance] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Customer views their own ledger (sales and payments).
   */
  async getCustomerLedger(customerId: string) {
    console.log('[CustomerService.getCustomerLedger] Called for customerId:', customerId);

    try {
      const sales = await this.prisma.salesTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
      
      const payments = await this.prisma.payment.findMany({
        where: { customerId, type: 'CUSTOMER_PAYMENT' },
        orderBy: { createdAt: 'desc' },
      });

      return { sales, payments };
    } catch (error) {
      console.error('[CustomerService.getCustomerLedger] ERROR:', error.message || error);
      throw error;
    }
  }

  /**
   * Customer views a specific sale invoice (abstract, customer-facing view).
   * Shows items with product names, totals, edit history — but NOT purchase prices or profit.
   */
  async getCustomerSaleDetail(customerId: string, saleId: string) {
    console.log('[CustomerService.getCustomerSaleDetail] Called for saleId:', saleId);

    const sale = await this.prisma.salesTransaction.findFirst({
      where: { id: saleId, customerId },
      include: { shop: { select: { name: true } } },
    });

    if (!sale) {
      throw new NotFoundException('Invoice not found');
    }

    // Resolve product names (abstract view — no purchase prices exposed)
    const items = await Promise.all(
      sale.items.map(async (item) => {
        const product = await this.prisma.product.findFirst({
          where: { id: item.productId },
          select: { name: true, unit: true },
        });
        return {
          productName: product?.name || 'Product',
          qty: item.qty,
          price: item.sellingPrice,
          total: item.total,
          unit: product?.unit || 'PIECES',
        };
      })
    );

    // Get edit history for this invoice
    const editHistory = await this.prisma.invoiceEditLog.findMany({
      where: { invoiceId: saleId, invoiceType: 'SALE' },
      orderBy: { editedAt: 'desc' },
      select: {
        reason: true,
        changesSummary: true,
        editedAt: true,
      },
    });

    return {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      shopName: sale.shop.name,
      date: sale.createdAt,
      items,
      subtotal: sale.subtotal,
      discount: sale.discount,
      paidAmount: sale.paidAmount,
      dueAmount: sale.dueAmount,
      paymentMode: sale.paymentMode,
      notes: sale.notes,
      // Edit transparency
      isEdited: sale.editCount > 0,
      editCount: sale.editCount,
      lastEditedAt: sale.lastEditedAt,
      lastEditReason: sale.lastEditReason,
      editHistory,
    };
  }

  /**
   * Get all shops linked to the authenticated customer (based on phone/email).
   */
  async getMyShops(identifier: string) {
    console.log('[CustomerService.getMyShops] Called for identifier:', identifier);

    if (!identifier) {
      return [];
    }

    const customers = await this.prisma.customer.findMany({
      where: {
        isDeleted: false,
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
      },
      include: { shop: { select: { id: true, name: true, shopCode: true } } },
    });

    return customers.map(c => ({
      shopId: c.shopId,
      shopName: c.shop.name,
      shopCode: c.shop.shopCode,
      totalReceivable: c.totalReceivable,
      customerName: c.name,
    }));
  }

  /**
   * Switch shop without re-entering password (requires valid JWT token).
   */
  async switchShop(identifier: string, shopId: string) {
    console.log('[CustomerService.switchShop] Switching to shopId:', shopId, 'for:', identifier);

    if (!identifier) {
      throw new UnauthorizedException('Invalid customer session');
    }

    const customers = await this.prisma.customer.findMany({
      where: {
        isDeleted: false,
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
      },
      include: { shop: { select: { id: true, name: true, shopCode: true } } },
    });

    const targetCustomer = customers.find(c => c.shopId === shopId);
    if (!targetCustomer) {
      throw new UnauthorizedException('You are not registered with this shop');
    }

    return this.generateCustomerToken(targetCustomer);
  }
}
