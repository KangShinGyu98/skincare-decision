// HTTP controller skeleton for reaction traceback routes.
import { Controller } from '@nestjs/common';
import { TracebackService } from './traceback.service';

@Controller('reactions')
export class TracebackController {
  constructor(private readonly tracebackService: TracebackService) {}
}
