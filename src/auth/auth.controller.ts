import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterSchema } from './dto/register.dto';
import { LoginSchema } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Register a new shopkeeper with their shop.
   * No authentication required.
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new shopkeeper and shop' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['shopName', 'name', 'email', 'password'],
      properties: {
        shopName: { type: 'string', example: 'Mitesh General Store' },
        name: { type: 'string', example: 'Mitesh Kumar' },
        email: { type: 'string', example: 'mitesh@example.com' },
        password: { type: 'string', example: 'password123' },
        interestRate: { type: 'number', example: 2, description: 'Monthly interest rate (%)' },
        defaultCreditDuration: { type: 'number', example: 30, description: 'Default credit period in days' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Registration successful, returns JWT token and user info' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() body: RegisterDto) {
    const validationResult = RegisterSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const result = await this.authService.register(validationResult.data);

    return {
      status: 'success',
      message: 'Registration successful',
      data: result,
    };
  }

  /**
   * POST /auth/login
   * Login with email and password.
   * No authentication required.
   */
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'mitesh@example.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Login successful, returns JWT token and user info' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() body: LoginDto) {
    const validationResult = LoginSchema.safeParse(body);
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.format());
    }

    const result = await this.authService.login(validationResult.data);

    return {
      status: 'success',
      message: 'Login successful',
      data: result,
    };
  }
}
