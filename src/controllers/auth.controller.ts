import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginDto } from '@dto/auth/login.dto';
import { SignUpDto } from '@dto/auth/signup.dto';
import { ForgotPasswordDto } from '@dto/auth/forgot-password.dto';
import { ResetPasswordDto } from '@dto/auth/reset-password.dto';
import { AUTH_SERVICE } from '@common/constant/auth.constant';
import type { IAuthService } from '@services/auth/auth.service.interface';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authService: IAuthService,
  ) {}

  @Post('signup')
  signup(@Body() dto: SignUpDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: true, // true nếu HTTPS
      sameSite: 'strict',
      path: '/auth/refresh-token',
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh-token')
  refreshToken(@Req() req: Request) {
    const token = req.cookies?.refreshToken;

    if (!token) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return this.authService.refreshToken(token);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
