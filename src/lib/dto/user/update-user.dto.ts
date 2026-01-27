import { IsOptional, IsString, IsPhoneNumber, IsUrl } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsPhoneNumber('VN')
  phone?: string;
}
