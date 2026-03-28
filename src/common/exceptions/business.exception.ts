import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    private readonly errorCode: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, any>,
  ) {
    super({ code: errorCode, message, details }, status);
  }
}

// Sử dụng:
// throw new BusinessException(
//   'PRODUCT_OUT_OF_STOCK',
//   'Sản phẩm đã hết hàng',
//   HttpStatus.UNPROCESSABLE_ENTITY,
//   { productId: 5, currentStock: 0 },
// );
