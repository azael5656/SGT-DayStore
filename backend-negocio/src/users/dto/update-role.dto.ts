import { IsIn } from 'class-validator';
import type { Role } from '../../auth/entities/user.entity';

export class UpdateRoleDto {
  @IsIn(['superadmin', 'admin', 'vendedor'])
  role!: Role;
}
