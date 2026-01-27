import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@services/prisma/prisma.service';
import { IRefreshTokenService } from './refresh-token.service.interface';
import { RefreshTokenWithUserModel } from '@models/refresh-token/refresh-token-with-user.model';

@Injectable()
export class RefreshTokenService implements IRefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async save(token: string, userId: number, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  async getValid(token: string): Promise<RefreshTokenWithUserModel> {
    const record = await this.prisma.refreshToken.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!record)
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );

    return {
      id: record.id,
      token: record.token,
      userId: record.userId,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      user: {
        id: record.user.id,
        username: record.user.username,
        name: record.user.name,
        email: record.user.email,
        avatar: record.user.avatar!,
        phone: record.user.phone,
        role: record.user.role,
      },
    };
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async revokeAllByUser(userId: number): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
