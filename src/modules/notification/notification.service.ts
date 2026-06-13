import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, TaskStatus } from '@prisma/client';
import * as webPush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeTask } from '../task/task-response.util';
import { RemovePushSubscriptionDto } from './dto/remove-push-subscription.dto';
import { SavePushSubscriptionDto } from './dto/save-push-subscription.dto';
import { SendTestNotificationDto } from './dto/send-test-notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async saveSubscription(userId: string, dto: SavePushSubscriptionDto) {
    const subscription = await this.prismaService.pushSubscription.upsert({
      where: {
        endpoint: dto.endpoint,
      },
      update: {
        userId,
        p256dhKey: dto.keys.p256dh,
        authKey: dto.keys.auth,
        expiresAt: this.toExpiresAt(dto.expirationTime),
        deletedAt: null,
      },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dhKey: dto.keys.p256dh,
        authKey: dto.keys.auth,
        expiresAt: this.toExpiresAt(dto.expirationTime),
      },
    });

    return this.serializeSubscription(subscription);
  }

  async removeSubscription(userId: string, dto: RemovePushSubscriptionDto) {
    const subscription = await this.prismaService.pushSubscription.findFirst({
      where: {
        userId,
        endpoint: dto.endpoint,
        deletedAt: null,
      },
    });

    if (!subscription) {
      return {
        removed: false,
      };
    }

    const deletedSubscription = await this.prismaService.pushSubscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      removed: true,
      subscription: this.serializeSubscription(deletedSubscription),
    };
  }

  async sendTestNotification(userId: string, dto: SendTestNotificationDto) {
    this.ensureVapidConfig();

    const subscriptions = await this.prismaService.pushSubscription.findMany({
      where: {
        userId,
        deletedAt: null,
      },
    });

    if (!subscriptions.length) {
      throw new BadRequestException('No active push subscriptions found');
    }

    const payload = {
      type: 'test-notification',
      title: dto.title ?? 'Test Notification',
      body: dto.body ?? 'Push notifications are working.',
      serverTime: new Date().toISOString(),
    };

    const delivery = await this.sendToSubscriptions(subscriptions, payload);

    return {
      ...delivery,
      payload,
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sendReminderNotifications() {
    if (!this.hasVapidConfig()) {
      return;
    }

    const dueTasks = await this.prismaService.task.findMany({
      where: {
        deletedAt: null,
        status: {
          not: TaskStatus.DONE,
        },
        reminderAt: {
          lte: new Date(),
        },
        reminderSentAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 50,
      orderBy: {
        reminderAt: 'asc',
      },
    });

    for (const task of dueTasks) {
      const subscriptions = await this.prismaService.pushSubscription.findMany({
        where: {
          userId: task.userId,
          deletedAt: null,
        },
      });

      if (!subscriptions.length) {
        continue;
      }

      const payload = {
        type: 'task-reminder',
        title: 'Task Reminder',
        body: task.title,
        task: serializeTask(task),
        serverTime: new Date().toISOString(),
      };

      const delivery = await this.sendToSubscriptions(subscriptions, payload);

      if (delivery.sentCount > 0) {
        await this.prismaService.task.update({
          where: {
            id: task.id,
          },
          data: {
            reminderSentAt: new Date(),
          },
        });
      }
    }
  }

  private async sendToSubscriptions(
    subscriptions: Array<{
      id: string;
      endpoint: string;
      p256dhKey: string;
      authKey: string;
    }>,
    payload: Record<string, unknown>,
  ) {
    const vapidDetails = this.getVapidDetails();
    let sentCount = 0;
    let failedCount = 0;

    for (const subscription of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey,
            },
          },
          JSON.stringify(payload),
          {
            vapidDetails,
            TTL: 60,
          },
        );
        sentCount += 1;
      } catch (error) {
        failedCount += 1;
        const statusCode = this.getStatusCode(error);
        this.logger.warn(
          `Push delivery failed for subscription ${subscription.id} with status ${statusCode ?? 'unknown'}`,
        );

        if (statusCode === 404 || statusCode === 410) {
          await this.prismaService.pushSubscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              deletedAt: new Date(),
            },
          });
        }
      }
    }

    return {
      sentCount,
      failedCount,
      totalSubscriptions: subscriptions.length,
    };
  }

  private serializeSubscription(subscription: {
    id: string;
    userId: string;
    endpoint: string;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    return {
      id: subscription.id,
      userId: subscription.userId,
      endpoint: subscription.endpoint,
      expiresAt: subscription.expiresAt,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      deletedAt: subscription.deletedAt,
    };
  }

  private ensureVapidConfig() {
    if (!this.hasVapidConfig()) {
      throw new BadRequestException(
        'VAPID configuration is missing. Set VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY.',
      );
    }
  }

  private hasVapidConfig() {
    return Boolean(
      process.env.VAPID_SUBJECT &&
        process.env.VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY,
    );
  }

  private getVapidDetails() {
    return {
      subject: process.env.VAPID_SUBJECT as string,
      publicKey: process.env.VAPID_PUBLIC_KEY as string,
      privateKey: process.env.VAPID_PRIVATE_KEY as string,
    };
  }

  private toExpiresAt(expirationTime?: number | null) {
    if (expirationTime === undefined) {
      return undefined;
    }

    if (expirationTime === null) {
      return null;
    }

    return new Date(expirationTime);
  }

  private getStatusCode(error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
    ) {
      return (error as { statusCode: number }).statusCode;
    }

    return null;
  }
}
