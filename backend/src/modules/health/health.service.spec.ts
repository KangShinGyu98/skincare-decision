// Unit test for the backend health service.
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns the backend liveness payload', () => {
    const service = new HealthService();
    const result = service.getStatus();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('backend');
    expect(typeof result.timestamp).toBe('string');
  });
});
