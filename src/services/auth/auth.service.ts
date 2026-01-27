import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
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
  UserModel,
} from '@models/auth/auth.model';
import { PrismaService } from '@services/prisma/prisma.service';
import { MailService } from '@services/mail/mail.service';
import { Role, User } from 'generated/prisma/client';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /* ===================== PRIVATE MAPPER ===================== */
  private toUserModel(user: User): UserModel {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
    };
  }

  /* ===================== SIGN UP ===================== */
  async signup(dto: SignUpDto): Promise<SignUpModel> {
    const existedUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existedUser) {
      throw new BadRequestException('Username hoặc email đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        role: Role.CUSTOMER,
      },
    });

    return {
      message: 'Đăng ký thành công',
      user: this.toUserModel(user),
    };
  }

  /* ===================== LOGIN ===================== */
  async login(dto: LoginDto): Promise<LoginModel> {
    const user = await this.prisma.user.findUnique({
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

    const payload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: this.toUserModel(user),
    };
  }

  /* ===================== REFRESH TOKEN ===================== */
  async refreshToken(token: string): Promise<RefreshTokenModel> {
    try {
      const payload = this.jwtService.verify(token);

      const accessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          role: payload.role,
        },
        { expiresIn: '15m' },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  /* ===================== FORGOT PASSWORD ===================== */
  async forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordModel> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '10m' },
    );

    await this.prisma.user.update({
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
    const user = await this.prisma.user.findFirst({
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

    await this.prisma.user.update({
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
