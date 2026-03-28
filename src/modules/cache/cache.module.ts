import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get<string>('REDIS_HOST', 'redis'),
            port: Number(configService.get<string>('REDIS_PORT', '6379')),
          },
          ttl: Number(configService.get<string>('CACHE_TTL', '600')),
        }),
      }),
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
