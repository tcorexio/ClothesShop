import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { IAddressService } from '@services/adress/address.serivce.interface';
import type { Request } from 'express';
import { ADDRESS_SERVICE } from '@common/constant/service.interface.constant';
import { CreateAddressDto } from '@dto/address/create-address.dto';
import { UpdateAddressDto } from '@dto/address/update-address.dto';
import { PageFilterDto } from '@dto/page/page-filter.dto';
import { AuthUser } from '@dto/auth/auth-user.interface';

@Controller('addresses')
export class AddressController {
  constructor(
    @Inject(ADDRESS_SERVICE)
    private readonly addressService: IAddressService,
  ) {}

  @Post()
  add(
    @Body() data: CreateAddressDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.addressService.Add(req.user.id, data);
  }

  @Get('me')
  getMyAddresses(
    @Req() req: Request & { user: AuthUser },
    @Query() pageFilter: PageFilterDto,
  ) {
    const user = req.user as { id: number };

    return this.addressService.GetByUserId(user.id, pageFilter);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.addressService.GetById(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateAddressDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    const user = req.user as { id: number };

    return this.addressService.Update(id, user.id, data);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: AuthUser },
  ) {
    const user = req.user as { id: number };

    return this.addressService.Delete(id, user.id);
  }
}
