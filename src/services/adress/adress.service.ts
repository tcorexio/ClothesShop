import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { IAddressService } from './address.serivce.interface';
import { CreateAddressDto } from '@dto/address/create-address.dto';
import { UpdateAddressDto } from '@dto/address/update-address.dto';
import { AddressModel } from '@models/address/address.model';
import { PrismaService } from '@services/prisma/prisma.service';
import { PageResponseModel } from '@models/page/page-response.model';
import { PageFilterDto } from '@dto/page/page-filter.dto';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class AdressService implements IAddressService {
  constructor(private readonly prismaService: PrismaService) {}
  async Add(userId: number, data: CreateAddressDto): Promise<AddressModel> {
    try {
      const address = await this.prismaService.address.create({
        data: {
          ...data,
          userId,
        },

        select: {
          id: true,
          street: true,
          city: true,
          ward: true,
          phone: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return address;
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async GetByUserId(
    userId: number,
    pageFilter: PageFilterDto,
  ): Promise<PageResponseModel<AddressModel>> {
    try {
      const { page, limit, sortBy, sortOrder } = pageFilter;

      const skip = (page - 1) * limit;

      const [data, totalItems] = await this.prismaService.$transaction([
        this.prismaService.address.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: sortBy
            ? {
                [sortBy]: sortOrder ?? 'desc',
              }
            : undefined,
        }),
        this.prismaService.address.count({
          where: { userId },
        }),
      ]);

      return {
        totalItems,
        content: data,
        totalPages: Math.ceil(totalItems / limit),
        pageSize: limit,
        pageNumber: page,
      };
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async GetById(id: number): Promise<AddressModel | null> {
    try {
      const address = await this.prismaService.address.findFirst({
        where: { id },
        select: {
          id: true,
          street: true,
          city: true,
          ward: true,
          phone: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return address;
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async Update(addressId: number, userId: number, data: UpdateAddressDto) {
    const address = await this.prismaService.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address không tồn tại');
    }

    return this.prismaService.address.update({
      where: { id: addressId },
      data,
    });
  }

  async Delete(addressId: number, userId: number): Promise<boolean> {
    const address = await this.prismaService.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address không tồn tại');
    }

    await this.prismaService.address.delete({
      where: { id: addressId },
    });

    return true;
  }

  async ExistsByIdAndUser(id: number, userId: number): Promise<boolean> {
    const address = await this.prismaService.address.findFirst({
      where: {
        id,
        userId,
      },
      select: { id: true },
    });

    return !!address; // !! dùng để ép nó về boolean
  }
}
