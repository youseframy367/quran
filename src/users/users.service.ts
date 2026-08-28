import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  // Creates a user entity and persists it in the database.
  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);

    return this.userRepository.save(user);
  }

  // Updates selected user fields, such as verification status or password.
  async updateById(id: number, data: Partial<User>): Promise<User> {
    await this.userRepository.update(id, data);
    const updatedUser = await this.findById(id);

    if (!updatedUser) {
      throw new Error('User was not found after update');
    }

    return updatedUser;
  }
}