import { UserModel } from '@models/user/user.model';
import { RefreshTokenModel } from './refresh-token.model';

export interface RefreshTokenWithUserModel extends RefreshTokenModel {
  user: UserModel;
}
