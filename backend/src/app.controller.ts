import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import type { RequestWithContext } from './common/types/express-request.type';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('health')
  health(@Req() req: RequestWithContext) {
    return {
      ok: true,
      requestId: req.context.requestId,
    };
  }
}
