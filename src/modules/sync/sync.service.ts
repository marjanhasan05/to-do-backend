import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  Prisma,
  SyncOperationStatus,
  SyncOperationType,
  Task,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeTask, serializeTaskForJson } from '../task/task-response.util';
import { SyncRequestDto } from './dto/sync-request.dto';
import { SyncOperationDto } from './dto/sync-operation.dto';

@Injectable()
export class SyncService {
  constructor(private readonly prismaService: PrismaService) {}

  async sync(userId: string, dto: SyncRequestDto) {
    const results: Array<Record<string, unknown>> = [];

    for (const operation of dto.operations) {
      const result = await this.processOperation(userId, operation);
      results.push(result);
    }

    const changedTasks = await this.getChangedTasks(userId, dto.lastSyncAt);

    return {
      operations: results,
      changedTasks,
    };
  }

  private async processOperation(userId: string, operation: SyncOperationDto) {
    const existingOperation = await this.prismaService.syncOperation.findFirst({
      where: {
        userId,
        operationId: operation.operationId,
      },
    });

    if (existingOperation) {
      return {
        ...(this.jsonObject(existingOperation.result) ?? {
          operationId: operation.operationId,
          status: existingOperation.status,
        }),
        replayed: true,
      };
    }

    switch (operation.type) {
      case SyncOperationType.CREATE:
        return this.handleCreate(userId, operation);
      case SyncOperationType.UPDATE:
        return this.handleUpdate(userId, operation);
      case SyncOperationType.DELETE:
        return this.handleDelete(userId, operation);
      default:
        throw new BadRequestException('Unsupported sync operation type');
    }
  }

  private async handleCreate(userId: string, operation: SyncOperationDto) {
    if (!operation.task?.title?.trim()) {
      return this.persistNonAppliedOperation(
        userId,
        operation,
        SyncOperationStatus.REJECTED,
        'Task title is required for create operations',
      );
    }

    const task = await this.prismaService.task.create({
      data: {
        userId,
        title: operation.task.title.trim(),
        description: operation.task.description?.trim() || null,
        status: operation.task.status ?? TaskStatus.TODO,
        priority: operation.task.priority ?? TaskPriority.MEDIUM,
        dueDate: this.toDateOrNull(operation.task.dueDate),
        reminderAt: this.toDateOrNull(operation.task.reminderAt),
        clientCreatedAt: this.toDateOrNull(operation.task.clientCreatedAt),
        clientUpdatedAt: this.toDateOrNull(
          operation.task.clientUpdatedAt ?? operation.task.clientCreatedAt,
        ),
        lastOperationId: operation.operationId,
      },
    });

    const result = {
      operationId: operation.operationId,
      type: operation.type,
      status: SyncOperationStatus.APPLIED,
      task: serializeTaskForJson(task),
    };

    await this.prismaService.syncOperation.create({
      data: {
        userId,
        taskId: task.id,
        operationId: operation.operationId,
        operationType: operation.type,
        taskVersion: task.version,
        status: SyncOperationStatus.APPLIED,
        payload: this.toJsonValue(operation),
        result: this.toJsonValue(result),
      },
    });

    return result;
  }

  private async handleUpdate(userId: string, operation: SyncOperationDto) {
    if (!operation.taskId) {
      return this.persistNonAppliedOperation(
        userId,
        operation,
        SyncOperationStatus.REJECTED,
        'taskId is required for update operations',
      );
    }

    if (operation.taskVersion === undefined) {
      return this.persistNonAppliedOperation(
        userId,
        operation,
        SyncOperationStatus.REJECTED,
        'taskVersion is required for update operations',
      );
    }

    const currentTask = await this.prismaService.task.findFirst({
      where: {
        id: operation.taskId,
        userId,
      },
    });

    if (!currentTask) {
      return this.persistNonAppliedOperation(
        userId,
        operation,
        SyncOperationStatus.REJECTED,
        'Task not found',
      );
    }

    if (currentTask.deletedAt || currentTask.version !== operation.taskVersion) {
      return this.persistConflictOperation(userId, operation, currentTask);
    }

    const updatedTask = await this.prismaService.task.update({
      where: {
        id: currentTask.id,
      },
      data: {
        ...(operation.task?.title !== undefined
          ? { title: operation.task.title.trim() }
          : {}),
        ...(operation.task?.description !== undefined
          ? { description: operation.task.description?.trim() || null }
          : {}),
        ...(operation.task?.status !== undefined
          ? { status: operation.task.status }
          : {}),
        ...(operation.task?.priority !== undefined
          ? { priority: operation.task.priority }
          : {}),
        ...(operation.task?.dueDate !== undefined
          ? { dueDate: this.toDateOrNull(operation.task.dueDate) }
          : {}),
        ...(operation.task?.reminderAt !== undefined
          ? { reminderAt: this.toDateOrNull(operation.task.reminderAt) }
          : {}),
        ...(operation.task?.clientCreatedAt !== undefined
          ? {
              clientCreatedAt: this.toDateOrNull(operation.task.clientCreatedAt),
            }
          : {}),
        ...(operation.task?.clientUpdatedAt !== undefined
          ? {
              clientUpdatedAt: this.toDateOrNull(operation.task.clientUpdatedAt),
            }
          : {}),
        lastOperationId: operation.operationId,
        version: {
          increment: 1,
        },
      },
    });

    const result = {
      operationId: operation.operationId,
      type: operation.type,
      status: SyncOperationStatus.APPLIED,
      task: serializeTaskForJson(updatedTask),
    };

    await this.prismaService.syncOperation.create({
      data: {
        userId,
        taskId: updatedTask.id,
        operationId: operation.operationId,
        operationType: operation.type,
        taskVersion: operation.taskVersion,
        status: SyncOperationStatus.APPLIED,
        payload: this.toJsonValue(operation),
        result: this.toJsonValue(result),
      },
    });

    return result;
  }

  private async handleDelete(userId: string, operation: SyncOperationDto) {
    if (!operation.taskId) {
      return this.persistNonAppliedOperation(
        userId,
        operation,
        SyncOperationStatus.REJECTED,
        'taskId is required for delete operations',
      );
    }

    if (operation.taskVersion === undefined) {
      return this.persistNonAppliedOperation(
        userId,
        operation,
        SyncOperationStatus.REJECTED,
        'taskVersion is required for delete operations',
      );
    }

    const currentTask = await this.prismaService.task.findFirst({
      where: {
        id: operation.taskId,
        userId,
      },
    });

    if (!currentTask) {
      return this.persistNonAppliedOperation(
        userId,
        operation,
        SyncOperationStatus.REJECTED,
        'Task not found',
      );
    }

    if (currentTask.deletedAt || currentTask.version !== operation.taskVersion) {
      return this.persistConflictOperation(userId, operation, currentTask);
    }

    const deletedTask = await this.prismaService.task.update({
      where: {
        id: currentTask.id,
      },
      data: {
        deletedAt: new Date(),
        lastOperationId: operation.operationId,
        version: {
          increment: 1,
        },
      },
    });

    const result = {
      operationId: operation.operationId,
      type: operation.type,
      status: SyncOperationStatus.APPLIED,
      task: serializeTaskForJson(deletedTask),
    };

    await this.prismaService.syncOperation.create({
      data: {
        userId,
        taskId: deletedTask.id,
        operationId: operation.operationId,
        operationType: operation.type,
        taskVersion: operation.taskVersion,
        status: SyncOperationStatus.APPLIED,
        payload: this.toJsonValue(operation),
        result: this.toJsonValue(result),
      },
    });

    return result;
  }

  private async persistConflictOperation(
    userId: string,
    operation: SyncOperationDto,
    currentTask: Task,
  ) {
    const result = {
      operationId: operation.operationId,
      type: operation.type,
      status: SyncOperationStatus.CONFLICT,
      conflict: {
        message: 'Task changed on the server',
        serverTask: serializeTaskForJson(currentTask),
      },
    };

    await this.prismaService.syncOperation.create({
      data: {
        userId,
        taskId: currentTask.id,
        operationId: operation.operationId,
        operationType: operation.type,
        taskVersion: operation.taskVersion,
        status: SyncOperationStatus.CONFLICT,
        payload: this.toJsonValue(operation),
        result: this.toJsonValue(result),
        errorMessage: 'Task changed on the server',
      },
    });

    return result;
  }

  private async persistNonAppliedOperation(
    userId: string,
    operation: SyncOperationDto,
    status: SyncOperationStatus,
    errorMessage: string,
  ) {
    const result = {
      operationId: operation.operationId,
      type: operation.type,
      status,
      errorMessage,
    };

    await this.prismaService.syncOperation.create({
      data: {
        userId,
        taskId: operation.taskId ?? null,
        operationId: operation.operationId,
        operationType: operation.type,
        taskVersion: operation.taskVersion,
        status,
        payload: this.toJsonValue(operation),
        result: this.toJsonValue(result),
        errorMessage,
      },
    });

    return result;
  }

  private async getChangedTasks(userId: string, lastSyncAt?: string) {
    const tasks = await this.prismaService.task.findMany({
      where: {
        userId,
        ...(lastSyncAt
          ? {
              updatedAt: {
                gt: new Date(lastSyncAt),
              },
            }
          : {
              deletedAt: null,
            }),
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    return tasks.map((task) => serializeTask(task));
  }

  private toDateOrNull(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    return new Date(value);
  }

  private toJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private jsonObject(value: Prisma.JsonValue | null) {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return null;
    }

    return value as Record<string, unknown>;
  }
}
