import { CreateAddressDto } from '@dto/address/create-address.dto';
import { UpdateAddressDto } from '@dto/address/update-address.dto';
import { PageFilterDto } from '@dto/page/page-filter.dto';
import { AddressModel } from '@models/address/address.model';
import { PageResponseModel } from '@models/page/page-response.model';

export interface IAddressService {
  // Tạo địa chỉ mới
  Add(data: CreateAddressDto): Promise<AddressModel>;

  // Lấy tất cả địa chỉ của user
  GetByUserId(
    userId: number,
    pageFilter: PageFilterDto,
  ): Promise<PageResponseModel<AddressModel>>;

  // Lấy chi tiết 1 địa chỉ
  GetById(id: number): Promise<AddressModel | null>;

  // Cập nhật địa chỉ
  Update(id: number, data: UpdateAddressDto): Promise<AddressModel>;

  // Xóa địa chỉ
  Delete(id: number): Promise<boolean>;

  // (Optional) Kiểm tra địa chỉ có thuộc user không
  ExistsByIdAndUser(id: number, userId: number): Promise<boolean>;
}
