import type { Task } from '@prisma/client';

export function serializeTask(task: Task) {
  return {
    id: task.id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    reminderAt: task.reminderAt,
    reminderSentAt: task.reminderSentAt,
    version: task.version,
    clientCreatedAt: task.clientCreatedAt,
    clientUpdatedAt: task.clientUpdatedAt,
    lastOperationId: task.lastOperationId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    deletedAt: task.deletedAt,
  };
}

export function serializeTaskForJson(task: Task) {
  return JSON.parse(JSON.stringify(serializeTask(task)));
}
