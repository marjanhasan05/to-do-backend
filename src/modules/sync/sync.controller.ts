import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { buildResponse } from '../../common/utils/api-response.util';
import { SyncRequestDto } from './dto/sync-request.dto';
import { SyncService } from './sync.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('sync')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  async sync(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SyncRequestDto,
  ) {
    const data = await this.syncService.sync(user.id, dto);
    return buildResponse(data, 'Sync completed');
  }
}
