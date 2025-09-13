import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateUserDto } from '@entities/user/dto/updateUser.dto';
import { User } from '../models/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  availableFields = ['name', 'phone', 'email', 'role'];

  private filterFields(body: { [k: string]: any }) {
    const filteredBody: { [k: string]: any } = {};

    Object.keys(body).filter((k) => {
      if (this.availableFields.includes(k)) {
        filteredBody[k] = body[k];
      }
    });

    return filteredBody;
  }

  public async create(userData: User) {
    const newUser = this.userRepository.create(userData);
    return await this.userRepository.save(newUser);
  }

  public async getUser(id: number) {
    return await this.userRepository.findOne({
      where: { id },
      select: [...(this.availableFields as any), 'id'],
    });
  }

  public async updateUserData(id: number, body: UpdateUserDto) {
    const data = this.filterFields(body);
    if (!Object.keys(data).length) {
      return null;
    }

    return await this.userRepository.update({ id }, this.filterFields(body));
  }

  public async getUsers() {
    return await this.userRepository.find({
      select: [...(this.availableFields as any), 'id'],
    });
  }

  public async deleteUser(id: number) {
    return await this.userRepository.delete(id);
  }

  public async findOneByEmail(email: string) {
    return await this.userRepository.findOne({
      where: [{ email: email }],
    });
  }

  public async findOneByEmailForeign(email: string, foreign: boolean) {
    return await this.userRepository.findOne({
      where: [{ email: email, foreign }],
    });
  }
}
