import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Register a new shopkeeper (ADMIN) along with their shop.
   * Creates both a Shop and an ADMIN User in a single atomic transaction.
   */
  async register(data: RegisterDto) {
    // 1. Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // 2. Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // 3. Create Shop + Admin User atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the shop first
      const shop = await tx.shop.create({
        data: {
          name: data.shopName,
          interestRate: data.interestRate ?? 0,
          defaultCreditDuration: data.defaultCreditDuration ?? 30,
        },
      });

      // Create the admin user linked to the shop
      const user = await tx.user.create({
        data: {
          shopId: shop.id,
          name: data.name,
          email: data.email,
          passwordHash: passwordHash,
          role: 'ADMIN',
        },
      });

      return { shop, user };
    });

    // 4. Generate JWT token so user is logged in immediately after registration
    const token = this.generateToken(result.user);

    return {
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        shopId: result.shop.id,
        shopName: result.shop.name,
      },
    };
  }

  /**
   * Login with email and password.
   * Returns a JWT token on success.
   */
  async login(data: LoginDto) {
    // 1. Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
      include: { shop: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Compare password with hash
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Generate JWT token
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
        shopName: user.shop.name,
      },
    };
  }

  /**
   * Generate a JWT token containing user info for authentication.
   */
  private generateToken(user: { id: string; email: string; role: string; shopId: string }): string {
    const secret = process.env.JWT_SECRET || 'mjrockseverybody';
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
    };

    return jwt.sign(payload, secret, { expiresIn: '7d' });
  }
}
