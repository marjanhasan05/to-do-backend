import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { buildResponse } from '../../common/utils/api-response.util';
import { UserService } from './user.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.userService.getCurrentUser(user.id);
    return buildResponse(data, 'Current user fetched successfully');
  }
}
