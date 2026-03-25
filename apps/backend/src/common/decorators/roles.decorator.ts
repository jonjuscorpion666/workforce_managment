import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const CurrentUser = () => (target: any, key: string, index: number) => {
  // param decorator for current user injection
};
