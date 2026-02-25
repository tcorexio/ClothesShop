import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class PageFilterDto {
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @Min(1, { message: 'Limit phải lớn hơn 1' })
  @Max(100, { message: 'Limit phải nhỏ hơn 100' })
  limit: number = 10;

  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @Min(1, { message: 'Page phải lớn hơn 1' })
  page: number = 1;

  @IsOptional()
  @IsString()
  sortBy?: string = 'id';

  @IsString()
  @Matches(/^(asc|desc)$/i, {
    message: 'Sort order phải là asc hoặc desc',
  })
  @IsOptional()
  sortOrder?: string = 'asc';

  normalize(): void {
    if (!this.page || this.page < 1) this.page = 1;
    if (!this.limit || this.limit < 1 || this.limit > 100) this.limit = 10;
    if (!this.sortBy) this.sortBy = 'id';
    if (
      !this.sortOrder ||
      !['asc', 'desc'].includes(this.sortOrder.toLowerCase())
    )
      this.sortOrder = 'asc';
  }
}
