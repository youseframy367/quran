import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

// This makes the database module available throughout the application.
@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      // Read database credentials from .env so secrets stay outside source control.
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'quran-data',

      // TypeORM uses this entity to build the users table and repository.
      entities: [User],

      // Keep this enabled only for local development; use migrations in production.
      synchronize: true,
    }),
  ],
  // Exporting TypeOrmModule makes its DataSource available to feature modules.
  exports: [TypeOrmModule],
})
export class DatabaseModule {}