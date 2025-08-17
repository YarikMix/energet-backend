import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    console.log('JwtGuard.canActivate');

    const isPublic = this.reflector.getAllAndOverride('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    console.log('isPublic', isPublic);

    const req = context.switchToHttp().getRequest();
    if (req.headers.cookie) return super.canActivate(context);

    if (isPublic) return true;

    return super.canActivate(context);
  }
}
