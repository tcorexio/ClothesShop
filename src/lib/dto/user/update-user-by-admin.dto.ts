import { IsEnum, IsOptional } from 'class-validator';
import { ROLE } from 'generated/prisma/enums';

export class UpdateUserByAdminDto {
  @IsOptional()
  @IsEnum(ROLE)
  role?: ROLE;

  @IsOptional()
  isDeleted?: boolean;
}
