import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getDashboardMetrics(@Req() req: any) {
    const shopId = req.user.shopId;
    
    // Total Receivables (Customers Due)
    const customers = await this.prisma.customer.findMany({ where: { shopId, isDeleted: false } });
    const totalDue = customers.reduce((sum, c) => sum + (c.totalReceivable || 0), 0);
    const customersWithDue = customers.filter(c => (c.totalReceivable || 0) > 0).length;

    // Total Payables (Suppliers Due)
    const suppliers = await this.prisma.supplier.findMany({ where: { shopId, isDeleted: false } });
    const totalCollected = suppliers.reduce((sum, s) => sum + (s.totalPayable || 0), 0); // This is payable

    // Monthly Sales
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const sales = await this.prisma.salesTransaction.findMany({
      where: { shopId, createdAt: { gte: startOfMonth } },
    });
    const overdueAmount = sales.reduce((sum, s) => sum + s.subtotal, 0); // This is Monthly Sales

    // Monthly Purchases
    const purchases = await this.prisma.purchase.findMany({
      where: { shopId, createdAt: { gte: startOfMonth } },
    });
    const monthlyRevenue = purchases.reduce((sum, p) => sum + p.subtotal, 0); // This is Monthly Purchases

    return {
      status: 'success',
      data: {
        totalDue,
        totalCollected,
        overdueAmount,
        monthlyRevenue,
        totalCustomers: customers.length,
        customersWithDue,
      }
    };
  }
}
