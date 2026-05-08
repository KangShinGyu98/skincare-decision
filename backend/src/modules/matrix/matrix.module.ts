// Matrix module wiring controller, service, and repository layers.
import { Module } from '@nestjs/common';
import { MatrixController } from './matrix.controller';
import { MatrixRepository } from './matrix.repository';
import { MatrixService } from './matrix.service';

@Module({
  controllers: [MatrixController],
  providers: [MatrixService, MatrixRepository],
  exports: [MatrixService],
})
export class MatrixModule {}
