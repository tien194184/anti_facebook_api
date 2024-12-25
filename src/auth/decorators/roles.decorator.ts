import { SetMetadata } from '@nestjs/common';
import { Role } from 'src/constants/role.enum';

export function Roles(roles: Role[]) {
    return SetMetadata('roles', roles);
}
