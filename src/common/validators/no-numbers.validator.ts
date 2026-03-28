// src/common/validators/no-numbers.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'NoNumbers', async: false })
export class NoNumbersConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    return typeof value !== 'string' || !/\d/.test(value);
  }
  defaultMessage(args: ValidationArguments): string {
    return `${args.property} không được chứa chữ số`;
  }
}

export function NoNumbers(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: NoNumbersConstraint,
    });
  };
}

// Dùng trong DTO:
// @IsString() @NoNumbers() name: string;
