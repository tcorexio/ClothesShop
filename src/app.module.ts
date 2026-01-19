import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from '@modules/prisma/prisma.module';
import { PrismaService } from '@services/prisma/prisma.service';
import { AuthController } from '@controllers/auth.controller';
import { AuthModule } from '@modules/auth/auth.module';
import { AuthService } from '@services/auth/auth.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController, AuthController],
  providers: [AppService, PrismaService, AuthService],
})
export class AppModule {}
