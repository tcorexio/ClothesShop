import { CreateUserDto } from '@dto/user/create-user.dto';
import { UpdateUserDto } from '@dto/user/update-user.dto';
import { UserFilterDto } from '@dto/user/user-filter.dto';
import { PageResponseModel } from '@models/page/page-response.model';
import { UserModel } from '@models/user/user.model';

export interface IUserService {
  Add(data: CreateUserDto): Promise<UserModel>;

  Update(userId: number, data: UpdateUserDto): Promise<UserModel>;

  SoftDeleteAsync(userId: number): Promise<boolean>;

  GetAllPage(dto: UserFilterDto): Promise<PageResponseModel<UserModel>>;

  GetUserByUserId(userId: number): Promise<UserModel>;

  GetUserByEmail(email: string): Promise<UserModel>;

  GetUserByUserName(username: string): Promise<UserModel>;

  ExistsByEmailAsync(email: string): Promise<boolean>;

  ExistByUserNameAsync(username: string): Promise<boolean>;
}
