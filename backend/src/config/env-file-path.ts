import { resolve } from 'node:path';

export function getEnvFilePath(): string {
  const nodeEnv = process.env['NODE_ENV'] ?? 'production';

  return resolve(process.cwd(), '..', `.env.${nodeEnv}`);
}
