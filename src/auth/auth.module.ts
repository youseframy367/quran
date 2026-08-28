import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';

// This module groups all authentication dependencies and routes.
@Module({
  imports: [
    UsersModule,
    // The secret must be replaced through JWT_SECRET in production.
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'development-only-secret-change-me',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService],
  exports: [AuthService],
})
export class AuthModule {}
