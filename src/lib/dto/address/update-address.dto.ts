import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from '@dto/address/create-address.dto';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
