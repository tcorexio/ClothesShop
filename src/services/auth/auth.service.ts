import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { IAuthService } from './auth.service.interface';

import { ForgotPasswordDto } from '@dto/auth/forgot-password.dto';
import { LoginDto } from '@dto/auth/login.dto';
import { ResetPasswordDto } from '@dto/auth/reset-password.dto';
import { SignUpDto } from '@dto/auth/signup.dto';

import {
  LoginModel,
  SignUpModel,
  ForgotPasswordModel,
  ResetPasswordModel,
  RefreshTokenModel,
} from '@models/auth/auth.model';
import { PrismaService } from '@services/prisma/prisma.service';
import { MailService } from '@services/mail/mail.service';
import { ROLE } from 'generated/prisma/enums';
import { User } from 'generated/prisma/client';
import { REFRESHTOKEN_SERVICE } from '@common/constant/service.interface.constant';
import type { IRefreshTokenService } from '@services/refresh-token/refresh-token.service.interface';
import { UserModel } from '@models/user/user.model';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @Inject(REFRESHTOKEN_SERVICE)
    private readonly refreshTokenService: IRefreshTokenService,
  ) {}

  /* ===================== PRIVATE MAPPER ===================== */
  private toUserModel(user: User): UserModel {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
    };
  }

  /* ===================== SIGN UP ===================== */
  async signup(dto: SignUpDto): Promise<SignUpModel> {
    const existedUser = await this.prismaService.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existedUser) {
      throw new BadRequestException('Username hoặc email đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        avatar: '',
        role: ROLE.CUSTOMER,
      },
    });

    return {
      message: 'Đăng ký thành công',
      user: this.toUserModel(user),
    };
  }

  /* ===================== LOGIN ===================== */
  async login(dto: LoginDto): Promise<LoginModel> {
    const user = await this.prismaService.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Sai username hoặc mật khẩu');
    }

    if (user.isDeleted) {
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hoá');
    }

    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Sai mật khẩu');
    }

    const payload = { sub: user.id, role: user.role };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.refreshTokenService.save(
      refreshToken,
      user.id,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return {
      accessToken,
      refreshToken,
      user: this.toUserModel(user),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenService.revoke(refreshToken);
  }

  /* ===================== REFRESH TOKEN ===================== */
  async refreshToken(token: string): Promise<RefreshTokenModel> {
    const record = await this.refreshTokenService.getValid(token);

    // revoke token cũ (rotation)
    await this.refreshTokenService.revoke(token);

    const payload = {
      sub: record.user.id,
      role: record.user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const newRefreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    await this.refreshTokenService.save(
      newRefreshToken,
      record.user.id,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /* ===================== FORGOT PASSWORD ===================== */
  async forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordModel> {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '10m' },
    );

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpire: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.mailService.sendResetPasswordMail(user.email, resetToken);

    return {
      message: 'Email khôi phục mật khẩu đã được gửi',
    };
  }

  /* ===================== RESET PASSWORD ===================== */
  async resetPassword(dto: ResetPasswordDto): Promise<ResetPasswordModel> {
    const user = await this.prismaService.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpire: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpire: null,
      },
    });

    return {
      message: 'Đổi mật khẩu thành công',
    };
  }
}
