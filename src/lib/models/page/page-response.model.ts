export class PageResponseModel<T> {
  content: T[];
  totalItems: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}
