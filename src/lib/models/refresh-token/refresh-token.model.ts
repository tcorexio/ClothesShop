export interface RefreshTokenModel {
  id: number;
  token: string;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
}
