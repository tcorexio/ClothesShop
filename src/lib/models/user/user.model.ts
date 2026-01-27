import { Role } from 'generated/prisma/enums';

export interface UserModel {
  id: number;
  email: string;
  username: string;
  name: string | null;
  avatar: string | null;
  phone?: string | null;
  role: Role;
}
