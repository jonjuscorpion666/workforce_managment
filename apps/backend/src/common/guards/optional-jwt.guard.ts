import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but never throws — if a valid token is present req.user is
 * populated, otherwise req.user stays undefined. Used for public endpoints that
 * benefit from knowing who the caller is when a token is provided (e.g. survey
 * submit, which uses the authenticated user's org context to tag responses).
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user ?? null;
  }
}
