export function isHealthCheckRequest(path: string | undefined): boolean {
  if (!path) {
    return false;
  }

  return path === '/api/health' || path.startsWith('/api/health?');
}
