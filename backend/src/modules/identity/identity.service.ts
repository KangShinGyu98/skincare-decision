// Service layer for identity-domain orchestration.
import { Injectable } from '@nestjs/common';
import { IdentityRepository } from './identity.repository';

@Injectable()
export class IdentityService {
  constructor(private readonly identityRepository: IdentityRepository) {}
}
