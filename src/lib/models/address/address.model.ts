export class AddressModel {
  id: number;
  street: string | null;
  city: string | null;
  ward: string | null;
  phone: string | null;

  userId: number;

  createdAt: Date;
  updatedAt: Date | null;
}
