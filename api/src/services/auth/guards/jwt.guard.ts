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
    console.log('req.headers.cookie', req.headers.cookie);
    console.log('req.headers.cookie', req.cookies);
    console.log(
      'access_token in req.headers.cookie',
      'access_token' in req.cookies,
    );

    if ('access_token' in req.cookies) return super.canActivate(context);

    if (isPublic) return true;

    return super.canActivate(context);
  }
}
