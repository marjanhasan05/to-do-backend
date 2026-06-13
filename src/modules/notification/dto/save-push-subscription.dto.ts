import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PushKeysDto {
  @ApiProperty()
  @IsString()
  p256dh: string;

  @ApiProperty()
  @IsString()
  auth: string;
}

export class SavePushSubscriptionDto {
  @ApiProperty()
  @IsUrl({
    require_tld: false,
  })
  endpoint: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  expirationTime?: number | null;

  @ApiProperty({ type: () => PushKeysDto })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}
