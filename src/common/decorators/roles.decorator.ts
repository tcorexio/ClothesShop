import { SetMetadata } from '@nestjs/common';
import { ROLE } from 'generated/prisma/enums';
export const ROLES_KEY = 'roles';
<<<<<<< HEAD
export const Roles = (...roles: ROLE[]) => SetMetadata(ROLES_KEY, roles);
=======
export const Roles = (...roles: ROLE[]) => SetMetadata(ROLES_KEY, roles);
>>>>>>> b76e2d9 (wip(cart): update cart service interface)
