import {
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  username: string;

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
}
