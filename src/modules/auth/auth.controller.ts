import {
  Body,
  Controller,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { buildResponse } from '../../common/utils/api-response.util';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RegisterDto } from './dto/register.dto';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Ip() ipAddress?: string,
  ) {
    const userAgent = request.headers['user-agent'];
    const data = await this.authService.register(dto, userAgent, ipAddress);
    return buildResponse(data, 'User registered successfully');
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Ip() ipAddress?: string,
  ) {
    const userAgent = request.headers['user-agent'];
    const data = await this.authService.login(dto, userAgent, ipAddress);
    return buildResponse(data, 'Login successful');
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
  ) {
    const data = await this.authService.logout(user.id, dto);
    return buildResponse(data, 'Logout successful');
  }
}
