import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';

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
  async check(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @User() user,
  ) {
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
  async authVK(@Res({ passthrough: true }) res) {
    console.log('authVK');
    console.log(JSON.stringify(res.body));
    console.log(JSON.stringify(process.env));

    const VKDATA = {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    };

    const data = await firstValueFrom(
      await this.httpService.get(
        `https://oauth.vk.com/access_token?client_id=${VKDATA.client_id}&client_secret=${VKDATA.client_secret}&redirect_uri=${'https://energet.shop'}/signin&code=${res.body.code}`,
      ),
    );

    console.log('data', JSON.stringify(data));
  }
}
