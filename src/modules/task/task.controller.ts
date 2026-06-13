import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  buildPaginatedResponse,
  buildResponse,
} from '../../common/utils/api-response.util';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTaskQueryDto } from './dto/list-task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    const data = await this.taskService.create(user.id, dto);
    return buildResponse(data, 'Task created successfully');
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTaskQueryDto,
  ) {
    const data = await this.taskService.findAll(user.id, query);
    return buildPaginatedResponse(
      data.items,
      data.meta,
      'Tasks fetched successfully',
    );
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.taskService.findOne(user.id, id);
    return buildResponse(data, 'Task fetched successfully');
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const data = await this.taskService.update(user.id, id, dto);
    return buildResponse(data, 'Task updated successfully');
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.taskService.remove(user.id, id);
    return buildResponse(data, 'Task deleted successfully');
  }
}
