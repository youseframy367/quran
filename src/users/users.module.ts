import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database/database.module';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import {UsersController} from "./users.controller"

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],

})
export class UsersModule {}
