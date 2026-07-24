import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUser = { sub: number; email: string; role: string };
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  context.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
