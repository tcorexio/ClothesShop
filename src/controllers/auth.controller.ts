import { Body, Controller, Headers, Inject, Post } from '@nestjs/common';

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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh-token')
  refreshToken(@Headers('authorization') authorization: string) {
    const token = authorization?.replace('Bearer ', '');
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
