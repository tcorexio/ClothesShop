import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsUrl,
  IsStrongPassword,
  IsPhoneNumber,
  Matches,
} from 'class-validator';
import { Role } from 'generated/prisma/enums';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  username: string;

  @IsNotEmpty()
  @IsEmail()
  @Matches(/^[^\s@]+@gmail\.com$/)
  email: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password phải ≥ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
    },
  )
  password: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber('VN')
  phone: string;

  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
