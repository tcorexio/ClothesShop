import { CreateAddressDto } from '@dto/address/create-address.dto';
import { UpdateAddressDto } from '@dto/address/update-address.dto';
import { PageFilterDto } from '@dto/page/page-filter.dto';
import { AddressModel } from '@models/address/address.model';
import { PageResponseModel } from '@models/page/page-response.model';

export interface IAddressService {
  Add(userId: number, data: CreateAddressDto): Promise<AddressModel>;

  GetByUserId(
    userId: number,
    pageFilter: PageFilterDto,
  ): Promise<PageResponseModel<AddressModel>>;

  GetById(id: number): Promise<AddressModel | null>;

  Update(
    addressId: number,
    userId: number,
    data: UpdateAddressDto,
  ): Promise<AddressModel>;

  Delete(addressId: number, userId: number): Promise<boolean>;

  ExistsByIdAndUser(id: number, userId: number): Promise<boolean>;
}
