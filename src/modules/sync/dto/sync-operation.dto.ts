import { SyncOperationType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SyncTaskPayloadDto } from './sync-task-payload.dto';

export class SyncOperationDto {
  @ApiProperty()
  @IsString()
  operationId: string;

  @ApiProperty({ enum: SyncOperationType, enumName: 'SyncOperationType' })
  @IsEnum(SyncOperationType)
  type: SyncOperationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  taskVersion?: number;

  @ApiPropertyOptional({ type: () => SyncTaskPayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncTaskPayloadDto)
  task?: SyncTaskPayloadDto;
}
