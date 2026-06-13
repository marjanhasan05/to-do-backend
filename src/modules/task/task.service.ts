import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTaskQueryDto } from './dto/list-task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { serializeTask } from './task-response.util';

@Injectable()
export class TaskService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(userId: string, dto: CreateTaskDto) {
    const task = await this.prismaService.task.create({
      data: {
        userId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status ?? TaskStatus.TODO,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null,
      },
    });

    return serializeTask(task);
  }

  async findAll(userId: string, query: ListTaskQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const updatedSince = query.updatedSince ? new Date(query.updatedSince) : null;
    const where: Prisma.TaskWhereInput = {
      userId,
      ...(updatedSince
        ? {
            updatedAt: {
              gt: updatedSince,
            },
          }
        : {
            deletedAt: null,
          }),
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    const orderBy: Prisma.TaskOrderByWithRelationInput = {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    };

    const [tasks, total] = await Promise.all([
      this.prismaService.task.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prismaService.task.count({ where }),
    ]);

    return {
      items: tasks.map((task) => serializeTask(task)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(userId: string, taskId: string) {
    const task = await this.findOwnedTaskOrThrow(userId, taskId);
    return serializeTask(task);
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    await this.findOwnedTaskOrThrow(userId, taskId);

    const task = await this.prismaService.task.update({
      where: {
        id: taskId,
      },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
        ...(dto.reminderAt !== undefined
          ? { reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null }
          : {}),
        version: {
          increment: 1,
        },
      },
    });

    return serializeTask(task);
  }

  async remove(userId: string, taskId: string) {
    await this.findOwnedTaskOrThrow(userId, taskId);

    const task = await this.prismaService.task.update({
      where: {
        id: taskId,
      },
      data: {
        deletedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    return serializeTask(task);
  }

  private async findOwnedTaskOrThrow(userId: string, taskId: string) {
    const task = await this.prismaService.task.findFirst({
      where: {
        id: taskId,
        userId,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }
}
