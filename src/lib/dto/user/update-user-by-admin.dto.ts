import { IsEnum, IsOptional } from 'class-validator';
import { Role } from 'generated/prisma/enums';

export class UpdateUserByAdminDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  isDeleted?: boolean;
}
