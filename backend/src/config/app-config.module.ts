// Global configuration module backed by zod environment validation.
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { envSchema } from './env.schema';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
      validate: (config) => envSchema.parse(config),
    }),
  ],
  providers: [AppConfigService],
  exports: [ConfigModule, AppConfigService],
})
export class AppConfigModule {}
