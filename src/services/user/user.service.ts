import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { IUserService } from './user.service.interface';
import { CreateUserDto } from '@dto/user/create-user.dto';
import { UpdateUserDto } from '@dto/user/update-user.dto';
import { PrismaService } from '@services/prisma/prisma.service';
import { UserModel } from '@models/user/user.model';
import * as bcrypt from 'bcrypt';
import { Role } from 'generated/prisma/enums';
import { UserFilterDto } from '@dto/user/user-filter.dto';
import { PageResponseModel } from '@models/page/page-response.model';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class UserService implements IUserService {
  constructor(private readonly prismaService: PrismaService) {}

  async ExistsByEmailAsync(email: string): Promise<boolean> {
    const user = await this.prismaService.user.findFirst({
      where: { email },
      select: { id: true },
    });

    return !!user;
  }

  async ExistByUserNameAsync(username: string): Promise<boolean> {
    const user = await this.prismaService.user.findFirst({
      where: { username },
      select: { id: true },
    });

    return !!user;
  }

  async Add(data: CreateUserDto): Promise<UserModel> {
    const userExistingByEmail = await this.ExistsByEmailAsync(data.email);
    if (userExistingByEmail) {
      throw new BadRequestException('Email đã tồn tại trong hệ thống');
    }

    const userExistingByUsername = await this.ExistByUserNameAsync(
      data.username,
    );
    if (userExistingByUsername) {
      throw new BadRequestException('Username đã tồn tại trong hệ thống');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        avatar: data.avatar,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        phone: true,
        role: true,
      },
    });

    return user;
  }

  async Update(userId: number, data: UpdateUserDto): Promise<UserModel> {
    const userExist = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!userExist) {
      throw new NotFoundException('User không tồn tại');
    }

    if (userExist.isDeleted) {
      throw new BadRequestException('User đã bị xóa');
    }

    const user = await this.prismaService.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        phone: true,
        role: true,
      },
    });

    return user;
  }

  async GetUserByUserId(userId: number): Promise<UserModel> {
    const user = await this.prismaService.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async GetUserByEmail(email: string): Promise<UserModel> {
    const user = await this.prismaService.user.findFirst({
      where: { email, isDeleted: false },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async GetUserByUserName(username: string): Promise<UserModel> {
    const user = await this.prismaService.user.findFirst({
      where: { username, isDeleted: false },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async GetAllPage(dto: UserFilterDto): Promise<PageResponseModel<UserModel>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'ASC',
      email,
      username,
      name,
      phone,
      role,
    } = dto;

    const where: Prisma.UserWhereInput = {
      ...(email && { email }),
      ...(username && { username }),
      ...(name && { name }),
      ...(phone && { phone }),
      ...(role && { role }),
      isDeleted: false,
    };

    const [data, totalItems] = await this.prismaService.$transaction([
      this.prismaService.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: sortBy
          ? {
              [sortBy]: sortOrder.toLocaleLowerCase() as 'asc' | 'desc',
            }
          : undefined,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          phone: true,
          role: true,
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      content: data,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      pageSize: limit,
      pageNumber: page,
    };
  }

  async SoftDeleteAsync(userId: number): Promise<boolean> {
    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
      },
    });

    return !!user;
  }
}
