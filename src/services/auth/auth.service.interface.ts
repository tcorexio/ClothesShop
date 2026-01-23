import { ForgotPasswordDto } from '@dto/auth/forgot-password.dto';
import { LoginDto } from '@dto/auth/login.dto';
import { ResetPasswordDto } from '@dto/auth/reset-password.dto';
import { SignUpDto } from '@dto/auth/signup.dto';
import {
  LoginModel,
  SignUpModel,
  ForgotPasswordModel,
  ResetPasswordModel,
  RefreshTokenModel,
} from '@models/auth/auth.model';

export interface IAuthService {
  login(dto: LoginDto): Promise<LoginModel>;
  signup(dto: SignUpDto): Promise<SignUpModel>;
  forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordModel>;
  resetPassword(dto: ResetPasswordDto): Promise<ResetPasswordModel>;
  refreshToken(token: string): Promise<RefreshTokenModel>;
}
