import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';

import { E_UserType } from '@entities/user/models/types';
import { faker } from '@faker-js/faker';
import { HttpService } from '@nestjs/axios';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@services/auth/decorators/user.decorator';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { Public } from './decorators/public.decorator';
import { RegisterRequestDto } from './dtos/register-request.dto';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly httpService: HttpService,
  ) {}

  @UseGuards(AuthGuard('local'))
  @Post('/login')
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(req.user);
    delete result.user.password;
    res.cookie('access_token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    res.status(HttpStatus.OK).send(result.user);
  }

  @Post('/register')
  async register(
    @Body() registerBody: RegisterRequestDto,
    @Res({ passthrough: true }) res,
  ) {
    const result = await this.authService.register(registerBody);
    delete result.user.password;
    res.cookie('access_token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    res.status(HttpStatus.OK).send(result.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/check')
  async check(@Res({ passthrough: true }) res: Response, @User() user) {
    if (user) {
      const userInfo = await this.authService.getUserInfo(user.email);
      res.status(HttpStatus.OK).send(userInfo);
    } else {
      res.status(HttpStatus.METHOD_NOT_ALLOWED).send();
    }
  }

  @Post('/logout')
  async logout(@Res({ passthrough: true }) res) {
    res.clearCookie('access_token');
  }

  @Post('/vk')
  async authVK(@Res({ passthrough: true }) res, @Req() req) {
    const response = await firstValueFrom(
      this.httpService.post('https://id.vk.com/oauth2/auth', {
        grant_type: 'authorization_code',
        code_verifier: 'codeVerifier',
        client_id: process.env.CLIENT_ID,
        device_id: req.body.deviceId,
        redirect_uri: process.env.REDIRECT_URI,
        code: req.body.code,
        scope: 'phone',
      }),
    );

    console.log('auth.data', JSON.stringify(response.data));
    const access_token = response.data.access_token;
    console.log('access_token', access_token);
    const response2 = await firstValueFrom(
      this.httpService.post('https://id.vk.com/oauth2/user_info', {
        client_id: process.env.CLIENT_ID,
        access_token,
      }),
    );

    console.log('user_info.status', response2.status);
    console.log('user_info.data', JSON.stringify(response2.data));

    const result = await this.authService.register({
      name: response2.data.first_name,
      phone: faker.phone.number(),
      email: response2.data.email,
      role: E_UserType.Buyer,
      password: faker.internet.password(),
    });
    console.log('result.user', JSON.stringify(result.user));
    delete result.user.password;
    res.cookie('access_token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    res.status(HttpStatus.OK).send(result.user);
  }
}
