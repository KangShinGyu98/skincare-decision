// HTTP controller skeleton for priority-gate routes.
import { Controller } from '@nestjs/common';
import { PriorityService } from './priority.service';

@Controller('priority-gate')
export class PriorityController {
  constructor(private readonly priorityService: PriorityService) {}
}
