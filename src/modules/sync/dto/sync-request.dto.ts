import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { SyncOperationDto } from './sync-operation.dto';

export class SyncRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastSyncAt?: string;

  @ApiProperty({ type: [SyncOperationDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations: SyncOperationDto[];
}
