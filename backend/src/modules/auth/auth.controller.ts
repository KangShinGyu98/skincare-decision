import { Controller, Get, Post, Req } from '@nestjs/common';
import { Authenticated, Permissions, Public } from '../../common/decorators/auth.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import type { RequestWithContext } from '../../common/types/express-request.type';
import { AuthService } from './auth.service';
import { loginBodySchema, type LoginBodyDto } from '@skincare-decision/shared/schemas';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@ZodBody(loginBodySchema) body: LoginBodyDto) {
    return this.authService.login(body.username, body.password);
  }

  @Authenticated()
  @Get('me')
  me(@Req() request: RequestWithContext) {
    return request.context.user;
  }

  @Permissions('user_responses:update:self')
  @Post('test/user-response')
  testUserPermission() {
    return { ok: true };
  }

  @Permissions('products:create:any')
  @Post('test/product')
  testAdminProductPermission() {
    return { ok: true };
  }

  @Permissions('priority_rules:manage:any')
  @Post('test/priority-rule')
  testAdminPriorityRulePermission() {
    return { ok: true };
  }
}
