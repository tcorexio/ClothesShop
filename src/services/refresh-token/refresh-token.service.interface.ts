import { RefreshTokenWithUserModel } from '@models/refresh-token/refresh-token-with-user.model';

export interface IRefreshTokenService {
  save(token: string, userId: number, expiresAt: Date): Promise<void>;
  getValid(token: string): Promise<RefreshTokenWithUserModel>;
  revoke(token: string): Promise<void>;
  revokeAllByUser(userId: number): Promise<void>;
}
