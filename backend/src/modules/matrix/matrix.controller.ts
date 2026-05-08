// HTTP controller skeleton for product-matrix routes.
import { Controller } from '@nestjs/common';
import { MatrixService } from './matrix.service';

@Controller('product-matrix')
export class MatrixController {
  constructor(private readonly matrixService: MatrixService) {}
}
