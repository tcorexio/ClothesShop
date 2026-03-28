export interface JwtPayload {
  sub: number | string;
  role?: string;
  scope?: string;
}
