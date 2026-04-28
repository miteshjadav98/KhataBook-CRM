import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionModule } from './transaction/transaction.module';
import { AuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [PrismaModule, TransactionModule, AuthModule, CustomerModule, ProductModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
