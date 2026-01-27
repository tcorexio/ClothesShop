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
import { ADDRESS_SERVICE } from '@common/constant/service.interface.constant';
import type { IAddressService } from '@services/adress/address.serivce.interface';
import { CreateAddressDto } from '@dto/address/create-address.dto';
import { UpdateAddressDto } from '@dto/address/update-address.dto';
import { AddressModel } from '@models/address/address.model';
import type { Request } from 'express';
import { PageFilterDto } from '@dto/page/page-filter.dto';

@Controller('addresses')
export class AddressController {
  constructor(
    @Inject(ADDRESS_SERVICE)
    private readonly addressService: IAddressService,
  ) {}

  @Post()
  add(@Body() data: CreateAddressDto, @Req() req: Request) {
    return this.addressService.Add(data);
  }

  @Get('user/:userId')
  getByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pageFilter: PageFilterDto,
  ) {
    return this.addressService.GetByUserId(userId, pageFilter);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.addressService.GetById(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateAddressDto,
  ) {
    return this.addressService.Update(id, data);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.addressService.Delete(id);
  }
}
