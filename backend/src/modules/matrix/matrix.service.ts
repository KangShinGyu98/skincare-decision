// Service layer for matrix-domain orchestration.
import { Injectable } from '@nestjs/common';
import { MatrixRepository } from './matrix.repository';

@Injectable()
export class MatrixService {
  constructor(private readonly matrixRepository: MatrixRepository) {}
}
