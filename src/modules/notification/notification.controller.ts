import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { buildResponse } from '../../common/utils/api-response.util';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { NotificationService } from './notification.service';
import { RemovePushSubscriptionDto } from './dto/remove-push-subscription.dto';
import { SavePushSubscriptionDto } from './dto/save-push-subscription.dto';
import { SendTestNotificationDto } from './dto/send-test-notification.dto';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('subscriptions')
  async saveSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SavePushSubscriptionDto,
  ) {
    const data = await this.notificationService.saveSubscription(user.id, dto);
    return buildResponse(data, 'Push subscription saved successfully');
  }

  @Delete('subscriptions')
  async removeSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RemovePushSubscriptionDto,
  ) {
    const data = await this.notificationService.removeSubscription(user.id, dto);
    return buildResponse(data, 'Push subscription removed successfully');
  }

  @Post('test')
  async sendTestNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendTestNotificationDto,
  ) {
    const data = await this.notificationService.sendTestNotification(user.id, dto);
    return buildResponse(data, 'Test notification processed');
  }
}
