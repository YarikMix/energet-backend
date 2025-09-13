import { User } from '@entities/user/models/user.entity';
import { UsersService } from '@entities/user/service/user.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthPayload } from '@services/auth/types/AuthPayload';
import * as bcrypt from 'bcrypt';
import { RegisterRequestDto } from './dtos/register-request.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user: User = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const isMatch: boolean = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Password does not match');
    }
    return user;
  }

  async login(userInfo: User): Promise<AuthPayload> {
    const payload = { email: userInfo.email, id: userInfo.id };
    const user = await this.usersService.findOneByEmailForeign(
      userInfo.email,
      false,
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    delete user.password;
    return {
      user,
      token: this.jwtService.sign(payload),
    };
  }

  async register(
    userRegisterInfo: RegisterRequestDto,
    vk = false,
  ): Promise<AuthPayload> {
    const existingUser = await this.usersService.findOneByEmail(
      userRegisterInfo.email,
    );
    if (existingUser) {
      if (vk) {
        return this.authVKUser(existingUser.email);
      }
      throw new BadRequestException('email already exists');
    }

    const hashedPassword = await bcrypt.hash(userRegisterInfo.password, 10);
    const newUserInfo: User = {
      ...userRegisterInfo,
      password: hashedPassword,
      foreign: vk,
    } as User;

    const newUser = await this.usersService.create(newUserInfo);
    delete newUser.password;

    const payload = { email: userRegisterInfo.email, id: newUser.id };
    const token = this.jwtService.sign(payload);

    return {
      user: newUser,
      token: token,
    };
  }

  async authVKUser(email: string): Promise<AuthPayload> {
    const userInfo = await this.usersService.findOneByEmailForeign(email, true);

    const payload = { email: userInfo.email, id: userInfo.id };
    delete userInfo.password;
    return {
      user: userInfo,
      token: this.jwtService.sign(payload),
    };
  }

  async getUserInfo(email: string): Promise<User> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    delete user.password;
    return user;
  }
}
