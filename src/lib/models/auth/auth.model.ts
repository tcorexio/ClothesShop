import { ROLE } from 'generated/prisma/enums';

export interface UserModel {
  id: number;
  email: string;
  username: string;
  avatar?: string | null;
  phone?: string | null;
  role: ROLE;
}

export interface AuthTokenModel {
  accessToken: string;
  refreshToken: string;
}

export interface LoginModel extends AuthTokenModel {
  user: UserModel;
}

export interface SignUpModel {
  message: string;
  user: UserModel;
}

export interface ForgotPasswordModel {
  message: string;
}

export interface ResetPasswordModel {
  message: string;
}

export interface RefreshTokenModel {
  accessToken: string;
  refreshToken: string;
}
