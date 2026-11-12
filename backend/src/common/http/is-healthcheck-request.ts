export function isHealthCheckRequest(path: string | undefined): boolean {
  if (!path) {
    return false;
  }

  return /^\/api\/health(\/db)?(\?|$)/.test(path);
}
