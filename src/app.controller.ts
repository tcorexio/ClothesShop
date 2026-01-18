import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('test-exception/:id')
  getException(@Param('id') id: string) {
    if (id === '1') {
      throw new BadRequestException('ID không hợp lệ');
    }

    if (id === '2') {
      throw new NotFoundException('Không tìm thấy dữ liệu');
    }

    if (id === '3') {
      throw new InternalServerErrorException('Lỗi hệ thống');
    }

    return {
      message: 'OK',
      id,
    };
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
