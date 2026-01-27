import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { USER_SERVICE } from '@common/constant/service.interface.constant';
import { CreateUserDto } from '@dto/user/create-user.dto';
import { UpdateUserDto } from '@dto/user/update-user.dto';
import type { IUserService } from '@services/user/user.service.interface';
import { UserFilterDto } from '@dto/user/user-filter.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';

@Controller('users')
export class UserController {
  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: IUserService,
  ) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.Add(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.Update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.userService.SoftDeleteAsync(id);
  }

  @Roles(Role.ADMIN)
  @Get('/search')
  getAll(@Query() dto: UserFilterDto) {
    return this.userService.GetAllPage(dto);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.GetUserByUserId(id);
  }

  @Get('by-email/:email')
  getByEmail(@Param('email') email: string) {
    return this.userService.GetUserByEmail(email);
  }

  @Get('by-username/:username')
  getByUsername(@Param('username') username: string) {
    return this.userService.GetUserByUserName(username);
  }

  @Get('exists/email/:email')
  existsByEmail(@Param('email') email: string) {
    return this.userService.ExistsByEmailAsync(email);
  }

  @Get('exists/username/:username')
  existsByUsername(@Param('username') username: string) {
    return this.userService.ExistByUserNameAsync(username);
  }
}
