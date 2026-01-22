import { ROLE } from 'generated/prisma/enums';

export interface UserModel {
  id: string;
  email: string;
  username: string;
  avatar: string;
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
}
